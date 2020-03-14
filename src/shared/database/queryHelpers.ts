/*

	queryHelpers.

	Logic for evaluating a datalog-like query.

*/

import * as _ from "lodash"
import { MAX, MIN, compare } from "./compare"
import { Database, Fact } from "./eavStore"
import { scanIndex, DatabaseValue } from "./indexHelpers"

/**
 * A query is a declarative datalog-like structure where strings that start
 * with a `?` are interpretted as unknown variables that need to be solved
 * for.
 *
 * The order of the statements *does not* matter.
 *
 * Example:
 *
 * 	const query = {
 * 		statements: [
 * 			["?pageId", "type", "page"],
 * 			["?pageId", "owner", "chet"],
 * 			["?pageId", "sort", "?sort"],
 * 		],
 * 		sort: [["?sort", -1], ["?pageId", 1]]
 * 	}
 *
 * TODO: it's really hard to make this really typesafe while also having
 * good programming ergonomics.
 */
export type Query = {
	statements: Array<Fact>
	sort?: Array<[string, 1 | -1]>
}

type Known = { type: "known"; value: DatabaseValue }
export type Unknown = { type: "unknown"; name: string }

/**
 * Query statments are interpretted into expressions with strings prefixed
 * with a `?` indicating an `Unknown`.
 */
export type Expression = {
	entity: Known | Unknown
	attribute: Known | Unknown
	value: Known | Unknown
}

function statementToExpression(statement: Fact): Expression {
	const [entity, attribute, value] = statement.map(value => {
		if (typeof value === "string" && value.startsWith("?")) {
			const unknown: Unknown = { type: "unknown", name: value.slice(1) }
			return unknown
		} else {
			const known: Known = { type: "known", value }
			return known
		}
	})
	return { entity, attribute, value }
}

/**
 * A `Binding` is a result set -- a mapping of unknowns to values that are
 * proven to exist in the database and satisfy the rules of the query statements
 */
export type Binding = { [name: string]: DatabaseValue }

/**
 * This logic determines which EAV index to scan to evaluate for the unknowns
 * in an expression. It returns the bindings as well as the facts that were
 * necessary for computing the result.
 *
 * TODO: The facts are returned so that we can easily sync data to the client.
 * However, we could derive the facts by replacing the unknowns in the query
 * with each binding.
 */
function evaluateExpression(
	database: Database,
	expression: Expression
): { bindings: Array<Binding>; facts: Array<Fact> } {
	const { entity, attribute, value } = expression

	if (entity.type === "known") {
		if (attribute.type === "known") {
			if (value.type === "known") {
				// EAV.
				const results = scanIndex(database.eav, {
					gte: [entity.value, attribute.value, value.value],
					lte: [entity.value, attribute.value, value.value],
				})
				// Bind the unknowns.
				const facts = results
				const bindings = results.map(() => ({}))
				return { bindings, facts }
			} else {
				// EA_
				const results = scanIndex(database.eav, {
					gte: [entity.value, attribute.value, MIN],
					lte: [entity.value, attribute.value, MAX],
				})
				// Bind the unknowns.
				const facts = results
				const bindings = facts.map(([e, a, v]) => {
					return { [value.name]: v }
				})
				return { bindings, facts }
			}
		} else {
			if (value.type === "known") {
				// E_V
				const results = scanIndex(database.vea, {
					gte: [value.value, entity.value, MIN],
					lte: [value.value, entity.value, MAX],
				})
				const facts = results.map(([v, e, a]) => [e, a, v] as Fact)
				// Bind the unknowns.
				const bindings = facts.map(([e, a, v]) => {
					return { [attribute.name]: a }
				})
				return { bindings, facts }
			} else {
				// E__
				// Warning: this is expensive.
				const results = scanIndex(database.eav, {
					gte: [entity.value, MIN, MIN],
					lte: [entity.value, MAX, MAX],
				})
				const facts = results
				// Bind the unknowns.
				const bindings = facts.map(([e, a, v]) => {
					return { [attribute.name]: a, [value.name]: v }
				})
				return { bindings, facts }
			}
		}
	} else {
		if (attribute.type === "known") {
			if (value.type === "known") {
				// _AV
				const results = scanIndex(database.ave, {
					gte: [attribute.value, value.value, MIN],
					lte: [attribute.value, value.value, MAX],
				})
				const facts = results.map(([a, v, e]) => [e, a, v] as Fact)
				// Bind the unknowns.
				const bindings = facts.map(([e, a, v]) => {
					return { [entity.name]: e }
				})
				return { bindings, facts }
			} else {
				// _A_
				// Warning: this is expensive.
				const results = scanIndex(database.ave, {
					gte: [attribute.value, MIN, MIN],
					lte: [attribute.value, MAX, MAX],
				})
				const facts = results.map(([a, v, e]) => [e, a, v] as Fact)
				// Bind the unknowns.
				const bindings = facts.map(([e, a, v]) => {
					return { [value.name]: v, [entity.name]: e }
				})
				return { bindings, facts }
			}
		} else {
			if (value.type === "known") {
				// __V
				// Warning: this is expensive.
				const results = scanIndex(database.vea, {
					gte: [value.value, MIN, MIN],
					lte: [value.value, MAX, MAX],
				})
				const facts = results.map(([v, e, a]) => [e, a, v] as Fact)
				// Bind the unknowns.
				const bindings = facts.map(([e, a, v]) => {
					return { [attribute.name]: a, [entity.name]: e }
				})
				return { bindings, facts }
			} else {
				// ___
				// Warning: this is *very* expensive.
				const results = scanIndex(database.eav, {
					gte: [MIN, MIN, MIN],
					lte: [MAX, MAX, MAX],
				})
				const facts = results
				// Bind the unknowns.
				const bindings = facts.map(([e, a, v]) => {
					return { [entity.name]: e, [attribute.name]: a, [value.name]: v }
				})
				return { bindings, facts }
			}
		}
	}
}

/**
 * A set of expressions that are logically AND'd together. All statements in
 * a clause must be satisfied for the clause to be satisfied.
 */
type Clause = Array<Expression>

export function statementsToClause(statements: Array<Fact>): Clause {
	return statements.map(statementToExpression)
}

function numberOfUnknowns(expression: Expression) {
	let count = 0
	for (const elm of Object.values(expression)) {
		if (elm.type === "unknown") {
			count += 1
		}
	}
	return count
}

/**
 * Evaluated a set of expressions returning both the results and the facts
 * necessary for evaluating the result. We can send the returned facts
 * to the client and re-evaluate this solution on the client.
 */
function evaluateClause(
	database: Database,
	clause: Clause
): { bindings: Array<Binding>; facts: Array<Fact> } {
	if (clause.length === 0) {
		return { bindings: [], facts: [] }
	}

	// The number of unknowns in an expression is a useful heuristic for how
	// performant the query is -- the more unknowns, the larger the scan and
	// the larger the result set. This is not always true because it depends
	// on the data ontology.
	// However, we can't rely on the original order of the clauses being
	// performant because we fill in unknowns when firing subscriptions
	// which often leads to a far less-than-optimal clause ordering.
	// Thus, we re-order the expressions with the least unknowns first.
	clause.sort((a, b) => numberOfUnknowns(a) - numberOfUnknowns(b))

	// Evaluate the first expression.
	const [first, ...rest] = clause
	const results = evaluateExpression(database, first)

	if (rest.length === 0) {
		return results
	}

	const allFacts = [...results.facts]

	// Otherwise substitute the unknowns
	const allBindings = results.bindings
		.map(binding => {
			// For each result of the first expression, fill in the unknowns in the
			// rest of the expressions to evaluate the rest of the solution.
			const remainingExpressions = rest.map(expression => {
				const resolved = { ...expression }
				if (resolved.entity.type === "unknown") {
					if (resolved.entity.name in binding) {
						resolved.entity = {
							type: "known",
							value: binding[resolved.entity.name],
						}
					}
				}
				if (resolved.attribute.type === "unknown") {
					if (resolved.attribute.name in binding) {
						resolved.attribute = {
							type: "known",
							value: binding[resolved.attribute.name],
						}
					}
				}
				if (resolved.value.type === "unknown") {
					if (resolved.value.name in binding) {
						resolved.value = {
							type: "known",
							value: binding[resolved.value.name],
						}
					}
				}
				return resolved
			})

			// Evaluate the rest of the solution and merge ther results.
			const remainingResults = evaluateClause(database, remainingExpressions)

			// TODO: this might be returning more facts than are strictly necessary for
			// the query. However, we'll be getting rid of this soon (see other TODOs).
			allFacts.push(...remainingResults.facts)
			return remainingResults.bindings.map(moreBindings => {
				return { ...moreBindings, ...binding }
			})
		})
		.reduce((acc, more) => [...acc, ...more], [])

	return { bindings: allBindings, facts: allFacts }
}

/**
 * Translated the `Query` into `Expression`s and sorts the results in-memory.
 *
 *
 * FUN FACT: Datomic sorts the entire solution set in memory and can not performantly
 * query large sets of ordered data! In the future, we will create indexes on queries
 * to avoid sorting the entire solution set in-memory.
 *
 * NOTE: sorting eliminates the possiblity of lazily generating a solution set. While
 * laziness is probably useful for theorem proving, its typically not useful in application
 * development to have an unordered list of results.
 */
export function evaluateQuery(database: Database, query: Query) {
	const clause = statementsToClause(query.statements)
	const results = evaluateClause(database, clause)
	if (query.sort) {
		const sort = query.sort
		const cmp = compare(query.sort.map(([name, direction]) => direction))
		results.bindings.sort((a, b) => {
			return cmp(
				sort.map(
					([varName]) => a[varName.slice(1)] // remove the leading `?`
				),
				sort.map(
					([varName]) => b[varName.slice(1)] // remove the leading `?`
				)
			)
		})
	}

	return results
}
