import * as _ from "lodash"
import { MAX, MIN, compare } from "./compare"
import { Database, DatabaseValue, Fact } from "./database"
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
	statements: Array<Fact>
	sort?: Array<[string, 1 | -1]>
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

function statementToExpression(statement: Fact): Expression {
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
export type Binding = { [name: string]: DatabaseValue }

function evaluateExpression(
	database: Database,
	expression: Expression
): { bindings: Array<Binding>; facts: Array<Fact> } {
	const { entity, attribute, value } = expression

	if (entity.type === "known") {
		if (attribute.type === "known") {
			if (value.type === "known") {
				// EAV.
				const facts = scanIndex(database.eav, {
					gte: [entity.value, attribute.value, value.value],
					lte: [entity.value, attribute.value, value.value],
				})
				// Bind the unknowns.
				const bindings = facts.map(() => ({}))
				return { bindings, facts }
			} else {
				// EA_
				const facts = scanIndex(database.eav, {
					gte: [entity.value, attribute.value, MIN],
					lte: [entity.value, attribute.value, MAX],
				})
				// Bind the unknowns.
				const bindings = facts.map(([e, a, v]) => {
					return { [value.name]: v }
				})
				return { bindings, facts }
			}
		} else {
			if (value.type === "known") {
				// E_V
				const facts = scanIndex(database.vea, {
					gte: [value.value, entity.value, MIN],
					lte: [value.value, entity.value, MAX],
				})
				// Bind the unknowns.
				const bindings = facts.map(([v, e, a]) => {
					return { [attribute.name]: a }
				})
				return { bindings, facts }
			} else {
				// E__
				// Warning: this is expensive.
				const facts = scanIndex(database.eav, {
					gte: [entity.value, MIN, MIN],
					lte: [entity.value, MAX, MAX],
				})
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
				const facts = scanIndex(database.ave, {
					gte: [attribute.value, value.value, MIN],
					lte: [attribute.value, value.value, MAX],
				})
				// Bind the unknowns.
				const bindings = facts.map(([a, v, e]) => {
					return { [entity.name]: e }
				})
				return { bindings, facts }
			} else {
				// _A_
				// Warning: this is expensive.
				const facts = scanIndex(database.ave, {
					gte: [attribute.value, MIN, MIN],
					lte: [attribute.value, MAX, MAX],
				})
				// Bind the unknowns.
				const bindings = facts.map(([a, v, e]) => {
					return { [value.name]: v, [entity.name]: e }
				})
				return { bindings, facts }
			}
		} else {
			if (value.type === "known") {
				// __V
				// Warning: this is expensive.
				const facts = scanIndex(database.vae, {
					gte: [value.value, MIN, MIN],
					lte: [value.value, MAX, MAX],
				})
				// Bind the unknowns.
				const bindings = facts.map(([v, a, e]) => {
					return { [attribute.name]: a, [entity.name]: e }
				})
				return { bindings, facts }
			} else {
				// ___
				// Warning: this is *very* expensive.
				const facts = scanIndex(database.eav, {
					gte: [MIN, MIN, MIN],
					lte: [MAX, MAX, MAX],
				})
				// Bind the unknowns.
				const bindings = facts.map(([e, a, v]) => {
					return { [entity.name]: e, [attribute.name]: a, [entity.name]: e }
				})
				return { bindings, facts }
			}
		}
	}
}

type Clause = Array<Expression>

function statementsToClause(statements: Array<Fact>): Clause {
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
): { bindings: Array<Binding>; facts: Array<Fact> } {
	if (clause.length === 0) {
		return { bindings: [], facts: [] }
	}

	// Re-order the expressions with the least unknowns first to reduce the
	// expected size result size.
	clause.sort((a, b) => numberOfUnknowns(a) - numberOfUnknowns(b))

	const [first, ...rest] = clause
	const results = evaluateExpression(database, first)

	if (rest.length === 0) {
		return results
	}

	const allFacts = [...results.facts]

	// Otherwise substitute the unknowns
	const allBindings = results.bindings
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
			const remainingResults = evaluateClause(database, remainingExpressions)
			allFacts.push(...remainingResults.facts)
			return remainingResults.bindings.map(moreBindings => {
				return { ...moreBindings, ...binding }
			})
		})
		.reduce((acc, more) => [...acc, ...more], [])

	return { bindings: allBindings, facts: allFacts }
}

export function evaluateQuery(database: Database, query: Query) {
	const clause = statementsToClause(query.statements)
	const results = evaluateClause(database, clause)
	if (query.sort) {
		const sort = query.sort
		const cmp = compare(query.sort.map(([name, direction]) => direction))
		results.bindings.sort((a, b) => {
			return cmp(
				sort.map(([varName]) => a[varName]),
				sort.map(([varName]) => b[varName])
			)
		})
	}

	return results
}

export type ListenPattern = Array<DatabaseValue | null>
export type InverseBinding = Array<Unknown | null>
export type Listener = {
	pattern: ListenPattern
	inverseBinding: InverseBinding
}

export function getListenersForQuery(query: Query) {
	const clause = statementsToClause(query.statements)
	const listeners: Array<Listener> = []

	for (const expression of clause) {
		const listener: Listener = { pattern: [], inverseBinding: [] }
		if (expression.entity.type === "known") {
			listener.pattern.push(expression.entity.value)
			listener.inverseBinding.push(null)
		} else {
			listener.pattern.push(null)
			listener.inverseBinding.push(expression.entity)
		}

		if (expression.attribute.type === "known") {
			listener.pattern.push(expression.attribute.value)
			listener.inverseBinding.push(null)
		} else {
			listener.pattern.push(null)
			listener.inverseBinding.push(expression.attribute)
		}

		if (expression.value.type === "known") {
			listener.pattern.push(expression.value.value)
			listener.inverseBinding.push(null)
		} else {
			listener.pattern.push(null)
			listener.inverseBinding.push(expression.value)
		}
		listeners.push(listener)
	}

	return listeners
}

export function getListenPatternsForFact(fact: Fact) {
	const listenKeys: Array<ListenPattern> = []
	for (const entity of [true, false]) {
		for (const attribute of [true, false]) {
			for (const value of [true, false]) {
				listenKeys.push([
					entity ? fact[0] : null,
					attribute ? fact[1] : null,
					value ? fact[2] : null,
				])
			}
		}
	}
	return listenKeys
}
