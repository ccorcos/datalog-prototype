/*

	TypeScript utilities.

*/

/**
 * Useful for enforcing that every condition of a union type was handled.
 */
export function unreachable(value: never): never {
	throw new Error(`Unreachable: ${JSON.stringify(value)}`)
}

export function unionTypeValues<T extends string>(
	args: { [K in T]: true }
): Array<T> {
	return Object.keys(args) as any
}

export function objectEntries<T>(
	obj: T
): Array<{ [K in keyof T]: [K, T[K]] }[keyof T]> {
	return Object.entries(obj) as any
}
