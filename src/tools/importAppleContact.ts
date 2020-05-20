/*

Extract contacts using https://github.com/ccorcos/contacts

./node_modules/.bin/ts-node src/tools/importAppleContact.ts

*/

import * as fs from "fs-extra"
import { rootPath } from "../shared/rootPath"
import { createSQLiteDatabase } from "../shared/database/sqlite"
import { createInMemoryDatabase } from "../shared/database/memory"
import {
	submitTransaction,
	Transaction,
} from "../shared/database/submitTransaction"

const dbPath = rootPath("database.json")
console.log(dbPath)
const database = createSQLiteDatabase(rootPath("eav.db"))
const subscriptions = createInMemoryDatabase()

function write(transaction: Transaction) {
	submitTransaction({
		subscriptions,
		database,
		transaction,
	})
}

const contents = fs.readFileSync(
	"/Users/chet/Code/contacts/contacts.json",
	"utf8"
)
const contacts = JSON.parse("[" + contents.replace(/\}\n\{/g, "},\n{") + "]")

for (const contact of contacts.slice(0, 10000)) {
	const id = contact["UID"]
	const firstName = contact["First"]
	const lastName = contact["Last"]
	const note = contact["Note"]

	const obj = { firstName, lastName, note }

	write({
		sets: [[id, "type", "person"]],
		unsets: [],
	})

	for (const [key, value] of Object.entries(obj)) {
		if (value) {
			write({
				sets: [[id, key, value]],
				unsets: [],
			})
		}
	}

	if (contact["Phone"]) {
		for (const phone of contact["Phone"]) {
			const phoneId = phone.identitier
			const phoneNumber = phone.value
			const phoneLabel = phone.label.slice(4, phone.label.length - 4)
			if (phoneId && phoneNumber && phoneLabel) {
				write({
					sets: [
						[id, "phone", phoneId],
						[phoneId, "phoneNumber", phoneNumber],
						[phoneId, "phoneLabel", phoneLabel],
					],
					unsets: [],
				})
			}
		}
	}

	if (contact["Email"]) {
		for (const email of contact["Email"]) {
			const emailId = email.identitier
			const emailAddress = email.value
			const emailLabel = email.label.slice(4, email.label.length - 4)
			if (emailId && emailAddress && emailLabel) {
				write({
					sets: [
						[id, "email", emailId],
						[emailId, "emailAddress", emailAddress],
						[emailId, "emailLabel", emailLabel],
					],
					unsets: [],
				})
			}
		}
	}

	if (contact["Address"]) {
		for (const address of contact["Address"]) {
			const addressId = address.identitier
			const addressValue = address.value
			const addressLabel = address.label.slice(4, address.label.length - 4)
			if (addressId && addressValue && addressLabel) {
				const addressStreet = addressValue["Street"]
				const addressState = addressValue["State"]
				const addressCity = addressValue["City"]
				write({
					sets: [
						[id, "address", addressId],
						[addressId, "addressLabel", addressLabel],
						[addressId, "addressStreet", addressStreet],
						[addressId, "addressState", addressState],
						[addressId, "addressCity", addressCity],
					],
					unsets: [],
				})
			}
		}
	}
}
