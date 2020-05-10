import diff from "diff-sequences"

function mergeTwoStrings(a: string, b: string) {
	let aIndex = 0
	let bIndex = 0
	let merged = ""

	diff(
		a.length,
		b.length,
		(ai, bi) => a[ai] === b[bi],
		(n, aStart, bStart) => {
			if (aStart !== aIndex) {
				merged += a.slice(aIndex, aStart)
			}
			if (bStart !== bIndex) {
				merged += b.slice(bIndex, bStart)
			}
			merged += a.slice(aStart, aStart + n)
			aIndex = aStart + n
			bIndex = bStart + n
		}
	)

	if (aIndex !== a.length) {
		merged += a.slice(aIndex)
	}
	if (bIndex !== b.length) {
		merged += b.slice(bIndex)
	}
	return merged
}

export function mergeStrings(...strings: Array<string>) {
	return strings.reduce((acc, str) => mergeTwoStrings(acc, str), "")
}
