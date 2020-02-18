/*

	Compare.

	Utilities for comparing tuples.

*/

import { SortDirections, DatabaseValue } from "./indexHelpers"

// MIN and MAX are useful for querying ranges.
export const MIN = Symbol("min")
export const MAX = Symbol("max")

// When querying ranges, we might not want to have upper or lower bounds.
// Thus, we can use MIN and MAX for that.
export type QueryValue = DatabaseValue | typeof MIN | typeof MAX

/**
 * Compare two query values and return a number, similar to `Array.sort`.
 * When values are not of the same type, the sort order is defined by:
 * `MAX > string > number > boolean > MIN`.
 */
function compareQueryValue(a: QueryValue, b: QueryValue) {
	if (a === MAX) {
		if (b === MAX) {
			return 0
		} else {
			return 1
		}
	}
	if (b === MAX) {
		return -1
	}
	if (a === MIN) {
		if (b === MIN) {
			return 0
		} else {
			return -1
		}
	}
	if (b === MIN) {
		return 1
	}
	if (typeof a === "string") {
		if (typeof b === "string") {
			if (a > b) {
				return 1
			} else if (a < b) {
				return -1
			} else {
				return 0
			}
		} else {
			// string > number > boolean
			return 1
		}
	} else if (typeof a === "number") {
		if (typeof b === "string") {
			// string > number > boolean
			return -1
		} else if (typeof b === "number") {
			return a - b
		} else {
			// string > number > boolean
			return 1
		}
	} else {
		if (typeof b === "boolean") {
			if (a === true && b === false) {
				return 1
			} else if (a === false && b === true) {
				return -1
			} else {
				return 0
			}
		} else {
			// string > number > boolean
			return -1
		}
	}
}

/**
 * Compare two tuples of the same length with varying sort directions.
 * This is used for generating composite indexes, similar to SQL.
 */
export function compare<T extends Array<QueryValue>>(
	directions: SortDirections<T>
) {
	return (a: T, b: T) => {
		if (a.length !== directions.length || b.length !== directions.length) {
			throw new Error("Invalid argument length")
		}
		for (let i = 0; i < directions.length; i++) {
			const direction = directions[i]
			const result = compareQueryValue(a[i], b[i]) * direction
			if (result !== 0) {
				return result
			}
		}
		return 0
	}
}
