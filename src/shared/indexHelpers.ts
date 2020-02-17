import { DatabaseValue, DatabaseIndex } from "./database"
import { binarySearch } from "./binarySearch"
import { compare, MIN, MAX, QueryValue } from "./compare"

export function addToIndex<T extends Array<DatabaseValue>>(
	index: DatabaseIndex<T>,
	value: T
) {
	const result = binarySearch(index.values, value, compare(index.sort))
	if (result.closest !== undefined) {
		// Insert at missing index.
		index.values.splice(result.closest, 0, value)
	}
}

export function removeFromIndex<T extends Array<DatabaseValue>>(
	index: DatabaseIndex<T>,
	value: T
) {
	let { found } = binarySearch(index.values, value, compare(index.sort))
	if (found !== undefined) {
		// Remove from index.
		index.values.splice(found, 1)
	}
}

export type QueryTuple<T extends Array<DatabaseValue>> = {
	[K in keyof T]: T[K] | typeof MIN | typeof MAX
}

export type ScanArgs<T extends Array<DatabaseValue>> = {
	gt?: QueryTuple<T>
	gte?: QueryTuple<T>
	lt?: QueryTuple<T>
	lte?: QueryTuple<T>
	limit?: number
}

export function scanIndex<T extends Array<DatabaseValue>>(
	index: DatabaseIndex<T>,
	args: ScanArgs<T> = {}
) {
	const lower = [...(args.gt || args.gte || [])] as QueryTuple<T>

	for (let i = lower.length; i < index.sort.length; i++) {
		if (args.gt) {
			lower[i] = MAX
		} else {
			lower[i] = MIN
		}
	}

	const upper = [...(args.lt || args.lte || [])] as QueryTuple<T>
	for (let i = upper.length; i < index.sort.length; i++) {
		if (args.lt) {
			upper[i] = MIN
		} else {
			upper[i] = MAX
		}
	}

	const cmp = compare<QueryTuple<T>>(index.sort)

	if (cmp(lower, upper) > 0) {
		throw new Error("Invalid bounds.")
	}

	// Start at lower bound.
	const result = binarySearch(index.values, lower, cmp)
	let i =
		result.found !== undefined
			? args.gte
				? result.found
				: result.found + 1
			: result.closest

	const results: Array<T> = []
	while (true) {
		// End of array.
		if (i >= index.values.length) {
			break
		}
		if (args.limit && results.length >= args.limit) {
			// Limit condition.
			break
		}
		// Upper bound condition.
		const tuple = index.values[i]
		const dir = cmp(tuple, upper)
		if (args.lt && dir >= 0) {
			break
		}
		if (args.lte && dir > 0) {
			break
		}
		results.push(tuple)
		i += 1
	}
	return results
}
