/*

	TypeScript utilities.

*/

/**
 * Useful for enforcing that every condition of a union type was handled.
 */
export function unreachable(value: never): never {
	throw new Error(`Unreachable: ${JSON.stringify(value)}`)
}
