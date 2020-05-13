import * as _ from "lodash"
import * as uuid from "uuid"
import md5 from "md5"

console.log(uuid)
export function createUuid(str?: string): string {
	if (str) {
		const hexStr = md5(str)
		const bytes = _.chunk(hexStr, 2).map((chars) =>
			parseInt(chars.join(""), 16)
		)
		return uuid.v4({ random: bytes })
	} else {
		return uuid.v4()
	}
}

export function isUuid(str: string) {
	return /^[0-9A-Za-z]{8}-[0-9A-Za-z]{4}-[0-9A-Za-z]{4}-[0-9A-Za-z]{4}-[0-9A-Za-z]{12}$/.test(
		str
	)
}
