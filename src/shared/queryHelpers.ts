import * as _ from "lodash"
import { QueryValue, MAX, MIN, compare } from "./compare"
import { Database, DatabaseValue, DatabaseValue3 } from "./database"
import { scanIndex } from "./indexHelpers"

/*
query = {
	statements: [
		["?e", "type", "page"],
		["?e", "owner", "chet"],
		["?e", "sort", "?s"],
	],
	sort: [["?s", -1], ["?e", 1]]
}
*/
export type Query = {
	statements: Array<DatabaseValue3>
	sort: Array<[string, 1 | -1]>
}

// Statements are a shorthand where strings that start with a question mark
// are interpreted as unknowns, then we parse them into proper expressions.
type Known = { type: "known"; value: DatabaseValue }
type Unknown = { type: "unknown"; name: string }

type Expression = {
	entity: Known | Unknown
	attribute: Known | Unknown
	value: Known | Unknown
}

function statementToExpression(statement: DatabaseValue3): Expression {
	const [entity, attribute, value] = statement.map(value => {
		if (typeof value === "string" && value.startsWith("?")) {
			const unknown: Unknown = { type: "unknown", name: value }
			return unknown
		} else {
			const known: Known = { type: "known", value }
			return known
		}
	})
	return { entity, attribute, value }
}

// A binding is a mapping from unknown variable names in an expression to a
// value. An Array<Binding> is a set of results for a given statement in a query.
type Binding = { [name: string]: DatabaseValue }

function evaluateExpression(
	database: Database,
	expression: Expression
): Array<Binding> {
	const { entity, attribute, value } = expression

	if (entity.type === "known") {
		if (attribute.type === "known") {
			if (value.type === "known") {
				// EAV.
				const result = scanIndex(database.eav, {
					gte: [entity.value, attribute.value, value.value],
					lte: [entity.value, attribute.value, value.value],
				})
				// No bindings.
				return result.map(() => ({}))
			} else {
				// EA_
				const result = scanIndex(database.eav, {
					gte: [entity.value, attribute.value, MIN],
					lte: [entity.value, attribute.value, MAX],
				})
				// Bind the unknowns.
				return result.map(([e, a, v]) => {
					return { [value.name]: v }
				})
			}
		} else {
			if (value.type === "known") {
				// E_V
				const result = scanIndex(database.vea, {
					gte: [value.value, entity.value, MIN],
					lte: [value.value, entity.value, MAX],
				})
				// Bind the unknowns.
				return result.map(([e, a, v]) => {
					return { [attribute.name]: a }
				})
			} else {
				// E__
				// Warning: this is expensive.
				const result = scanIndex(database.eav, {
					gte: [entity.value, MIN, MIN],
					lte: [entity.value, MAX, MAX],
				})
				// Bind the unknowns.
				return result.map(([e, a, v]) => {
					return { [attribute.name]: a, [value.name]: v }
				})
			}
		}
	} else {
		if (attribute.type === "known") {
			if (value.type === "known") {
				// _AV
				const result = scanIndex(database.ave, {
					gte: [attribute.value, value.value, MIN],
					lte: [attribute.value, value.value, MAX],
				})
				// Bind the unknowns.
				return result.map(([e, a, v]) => {
					return { [entity.name]: e }
				})
			} else {
				// _A_
				// Warning: this is expensive.
				const result = scanIndex(database.ave, {
					gte: [attribute.value, MIN, MIN],
					lte: [attribute.value, MAX, MAX],
				})
				// Bind the unknowns.
				return result.map(([e, a, v]) => {
					return { [value.name]: v, [entity.name]: e }
				})
			}
		} else {
			if (value.type === "known") {
				// __V
				// Warning: this is expensive.
				const result = scanIndex(database.vae, {
					gte: [value.value, MIN, MIN],
					lte: [value.value, MAX, MAX],
				})
				// Bind the unknowns.
				return result.map(([e, a, v]) => {
					return { [attribute.name]: a, [entity.name]: e }
				})
			} else {
				// ___
				// Warning: this is *very* expensive.
				const result = scanIndex(database.eav, {
					gte: [MIN, MIN, MIN],
					lte: [MAX, MAX, MAX],
				})
				// Bind the unknowns.
				return result.map(([e, a, v]) => {
					return { [entity.name]: e, [attribute.name]: a, [entity.name]: e }
				})
			}
		}
	}
}

type Clause = Array<Expression>

function statementsToClause(statements: Array<DatabaseValue3>): Clause {
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

export function evaluateClause(
	database: Database,
	clause: Clause
): Array<Binding> {
	if (clause.length === 0) {
		return []
	}

	// Re-order the expressions with the least unknowns first to reduce the
	// expected size result size.
	clause.sort((a, b) => numberOfUnknowns(a) - numberOfUnknowns(b))

	const [first, ...rest] = clause
	const bindings = evaluateExpression(database, first)

	// Otherwise substitute the unknowns
	const allBindings = bindings
		.map(binding => {
			// Bind the results of the previous expression to the rest of the clause.
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
				if (resolved.entity.type === "unknown") {
					if (resolved.entity.name in binding) {
						resolved.entity = {
							type: "known",
							value: binding[resolved.entity.name],
						}
					}
				}
				if (resolved.entity.type === "unknown") {
					if (resolved.entity.name in binding) {
						resolved.entity = {
							type: "known",
							value: binding[resolved.entity.name],
						}
					}
				}
				return resolved
			})
			const remainingResults = evaluateClause(database, remainingExpressions)
			return remainingResults.map(moreBindings => {
				return { ...moreBindings, ...binding }
			})
		})
		.reduce((acc, more) => [...acc, ...more], [])

	return allBindings
}

export function evaluateQuery(database: Database, query: Query) {
	const clause = statementsToClause(query.statements)
	const results = evaluateClause(database, clause)
	const cmp = compare(query.sort.map(([name, direction]) => direction))
	results.sort((a, b) => {
		return cmp(
			query.sort.map(([varName]) => a[varName]),
			query.sort.map(([varName]) => b[varName])
		)
	})
	return results
}
