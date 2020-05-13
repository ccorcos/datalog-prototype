import * as _ from "lodash"
import uuidv4 from "uuid/v4"
import md5 from "md5"

export function createUuid(str?: string): string {
	if (str) {
		const hexStr = md5(str)
		const bytes = _.chunk(hexStr, 2).map((chars) =>
			parseInt(chars.join(""), 16)
		)
		return uuidv4({ random: bytes })
	} else {
		return uuidv4()
	}
}

export function isUuid(str: string) {
	return /^[0-9A-Za-z]{8}-[0-9A-Za-z]{4}-[0-9A-Za-z]{4}-[0-9A-Za-z]{4}-[0-9A-Za-z]{12}$/.test(
		str
	)
}
