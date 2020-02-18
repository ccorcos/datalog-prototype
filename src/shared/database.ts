/*

	EAV Database (simplified).

*/

import { addToIndex, removeFromIndex } from "./indexHelpers"

export type SortDirections<T extends Array<any>> = {
	[K in keyof T]: 1 | -1
}
export type DatabaseValue = string | number | boolean

export type DatabaseIndex<T extends Array<DatabaseValue>> = {
	sort: SortDirections<T>
	values: Array<T>
}

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
