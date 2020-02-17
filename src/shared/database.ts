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

type Tuple3 = [DatabaseValue, DatabaseValue, DatabaseValue]

const eav: DatabaseIndex<Tuple3> = {
	sort: [1, 1, 1],
	values: [],
}
const ave: DatabaseIndex<Tuple3> = {
	sort: [1, 1, 1],
	values: [],
}
const aev: DatabaseIndex<Tuple3> = {
	sort: [1, 1, 1],
	values: [],
}
const vae: DatabaseIndex<Tuple3> = {
	sort: [1, 1, 1],
	values: [],
}
const vea: DatabaseIndex<Tuple3> = {
	sort: [1, 1, 1],
	values: [],
}

export const database = { eav, ave, aev, vae, vea }

export type Database = typeof database

export type Fact = [string, string, DatabaseValue]

export function set(database: Database, fact: Fact) {
	const [e, a, v] = fact
	for (const [name, index] of Object.entries(database)) {
		const chars = name.split("") as [
			"e" | "a" | "v",
			"e" | "a" | "v",
			"e" | "a" | "v"
		]
		const result = chars.map(char => ({ e, a, v }[char])) as Tuple3
		addToIndex(index, result)
	}
}

export function unset(database: Database, fact: Fact) {
	const [e, a, v] = fact
	for (const [name, index] of Object.entries(database)) {
		const chars = name.split("") as [
			"e" | "a" | "v",
			"e" | "a" | "v",
			"e" | "a" | "v"
		]
		const result = chars.map(char => ({ e, a, v }[char])) as Tuple3
		removeFromIndex(index, result)
	}
}
