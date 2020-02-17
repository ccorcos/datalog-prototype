export function binarySearch<T>(
	list: Array<T>,
	item: T,
	cmp: (a: T, b: T) => number
):
	| { found: number; closest?: undefined }
	| { found?: undefined; closest: number } {
	var min = 0
	var max = list.length - 1
	while (min <= max) {
		var k = (max + min) >> 1
		var dir = cmp(item, list[k])
		if (dir > 0) {
			min = k + 1
		} else if (dir < 0) {
			max = k - 1
		} else {
			return { found: k }
		}
	}
	return { closest: min }
}
