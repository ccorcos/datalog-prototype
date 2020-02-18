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
} from "./indexHelpers"

export type Fact = [DatabaseValue, DatabaseValue, DatabaseValue]

export const createEmptyDatabase = () => {
	const eav: DatabaseIndex<Fact> = {
		sort: [1, 1, 1],
		values: [],
	}
	const ave: DatabaseIndex<Fact> = {
		sort: [1, 1, 1],
		values: [],
	}
	const aev: DatabaseIndex<Fact> = {
		sort: [1, 1, 1],
		values: [],
	}
	const vae: DatabaseIndex<Fact> = {
		sort: [1, 1, 1],
		values: [],
	}
	const vea: DatabaseIndex<Fact> = {
		sort: [1, 1, 1],
		values: [],
	}
	return { eav, ave, aev, vae, vea }
}

export type Database = ReturnType<typeof createEmptyDatabase>

export function setFact(database: Database, fact: Fact) {
	const [e, a, v] = fact
	for (const [name, index] of Object.entries(database)) {
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

export function unsetFact(database: Database, fact: Fact) {
	const [e, a, v] = fact
	for (const [name, index] of Object.entries(database)) {
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

export type Transaction = {
	sets: Array<Fact>
	unsets: Array<Fact>
}

/**
 * Save a set of transactions in batch.
 */
export function submitTransaction(
	database: Database,
	transaction: Transaction
) {
	const { sets, unsets } = transaction
	for (const fact of sets) {
		setFact(database, fact)
	}
	for (const fact of unsets) {
		unsetFact(database, fact)
	}
}