/*

	Datalog Database (simplified).

*/

import {
	addToIndex,
	removeFromIndex,
	DatabaseValue,
	DatabaseIndex,
} from "./database/indexHelpers"

export type Fact = [DatabaseValue, DatabaseValue, DatabaseValue]

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

export const emptyDatabase = () => ({ eav, ave, aev, vae, vea })

export type Database = ReturnType<typeof emptyDatabase>

export function setFact(database: Database, fact: Fact) {
	const [e, a, v] = fact
	for (const [name, index] of Object.entries(database)) {
		const chars = name.split("") as [
			"e" | "a" | "v",
			"e" | "a" | "v",
			"e" | "a" | "v"
		]
		const result = chars.map(char => ({ e, a, v }[char])) as Fact
		addToIndex(index, result)
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
		const result = chars.map(char => ({ e, a, v }[char])) as Fact
		removeFromIndex(index, result)
	}
}
