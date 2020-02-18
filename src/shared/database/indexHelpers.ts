/*

	indexHelpers.

	A DatabaseIndex is a primative for storing data in sorted order so we can
	retrieve information in O(log n) time.

*/

import { binarySearch } from "../helpers/binarySearch"
import { compare, MIN, MAX } from "./compare"

/**
 * When building composite indexes, it becomes important to specify how you
 * want the tuples sorted.
 */
export type SortDirections<T extends Array<any>> = {
	[K in keyof T]: 1 | -1
}

/**
 * This database only stores simple primative values. You can construct larger
 * data structures from these primative if you want, but you will be responsible
 * for how that conversion works. That way, you have fine grained control over
 * how the CRDT works.
 */
export type DatabaseValue = string | number | boolean

/**
 * An index consists of an array of tuples in sorted order according to the
 * given sort.
 */
export type DatabaseIndex<T extends Array<DatabaseValue>> = {
	sort: SortDirections<T>
	values: Array<T>
}

/**
 * Insert a tuple into a `DatabaseIndex`.
 * `O(log n)` performance where `n` is the size of the index.
 */
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

/**
 * Remove a tuple from a `DatabaseIndex`.
 * `O(log n)` performance where `n` is the size of the index.
 */
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

/**
 * When querying for a range of values, it's we use `MIN` and `MAX` to
 * specify the absolute open bounds of a range.
 */
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

/**
 * Query a range of values from a `DatabaseIndex`.
 */
export function scanIndex<T extends Array<DatabaseValue>>(
	index: DatabaseIndex<T>,
	args: ScanArgs<T> = {}
) {
	const lower = [...(args.gt || args.gte || [])] as QueryTuple<T>
	const upper = [...(args.lt || args.lte || [])] as QueryTuple<T>

	const cmp = compare<QueryTuple<T>>(index.sort)

	if (cmp(lower, upper) > 0) {
		console.error({ upper, lower })
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
