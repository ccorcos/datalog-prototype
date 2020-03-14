/*

	EAV Store.

	A set of utilities for maintaining 5 permutations of 3-tuples, known by
	various names which you can google about:

	- Entity-Attribute-Value Store
	- Datomic
	- Datalog
	- Prolog
	- RDL
	- SPARQ

	Knowledgebases and graph databases typically rely on something like this
	under the hood.

*/

import {
	addToIndex,
	removeFromIndex,
	DatabaseValue,
	DatabaseIndex,
	scanIndex,
} from "./indexHelpers"
import { Expression, Binding } from "./queryHelpers"
import { MIN, MAX } from "./compare"

export type Fact = [DatabaseValue, DatabaseValue, DatabaseValue]

export interface Database {
	setFact(fact: Fact): void
	unsetFact(fact: Fact): void
	evaluateExpression(
		expression: Expression
	): { bindings: Array<Binding>; facts: Array<Fact> }
}

interface EAVIndexes {
	eav: DatabaseIndex<Fact>
	ave: DatabaseIndex<Fact>
	vea: DatabaseIndex<Fact>
}

// Only need three index to query a 3-tuple expression.
// e
// ea
// ev -> ve
// a
// av
// v
export function createEmptyDatabase(): Database {
	const eav: DatabaseIndex<Fact> = {
		sort: [1, 1, 1],
		values: [],
	}
	const ave: DatabaseIndex<Fact> = {
		sort: [1, 1, 1],
		values: [],
	}
	const vea: DatabaseIndex<Fact> = {
		sort: [1, 1, 1],
		values: [],
	}

	const indexes: EAVIndexes = { eav, ave, vea }

	return {
		setFact(fact: Fact) {
			return setFact(indexes, fact)
		},
		unsetFact(fact: Fact) {
			return unsetFact(indexes, fact)
		},
		evaluateExpression(expression) {
			return evaluateExpression(indexes, expression)
		},
	}
}

export function setFact(indexes: EAVIndexes, fact: Fact) {
	const [e, a, v] = fact
	for (const [name, index] of Object.entries(indexes)) {
		const chars = name.split("") as [
			"e" | "a" | "v",
			"e" | "a" | "v",
			"e" | "a" | "v"
		]
		// Reorder the fact for the corresponding index.
		const value = chars.map(char => ({ e, a, v }[char])) as Fact
		addToIndex(index, value)
	}
}

export function unsetFact(indexes: EAVIndexes, fact: Fact) {
	const [e, a, v] = fact
	for (const [name, index] of Object.entries(indexes)) {
		const chars = name.split("") as [
			"e" | "a" | "v",
			"e" | "a" | "v",
			"e" | "a" | "v"
		]
		// Reorder the fact for the corresponding index.
		const value = chars.map(char => ({ e, a, v }[char])) as Fact
		removeFromIndex(index, value)
	}
}

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
	indexes: EAVIndexes,
	expression: Expression
): { bindings: Array<Binding>; facts: Array<Fact> } {
	const { entity, attribute, value } = expression

	if (entity.type === "known") {
		if (attribute.type === "known") {
			if (value.type === "known") {
				// EAV.
				const results = scanIndex(indexes.eav, {
					gte: [entity.value, attribute.value, value.value],
					lte: [entity.value, attribute.value, value.value],
				})
				// Bind the unknowns.
				const facts = results
				const bindings = results.map(() => ({}))
				return { bindings, facts }
			} else {
				// EA_
				const results = scanIndex(indexes.eav, {
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
				const results = scanIndex(indexes.vea, {
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
				const results = scanIndex(indexes.eav, {
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
				const results = scanIndex(indexes.ave, {
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
				const results = scanIndex(indexes.ave, {
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
				const results = scanIndex(indexes.vea, {
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
				const results = scanIndex(indexes.eav, {
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
