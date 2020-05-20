/*

	ContactsApp

*/

import * as React from "react"
import { useQuery } from "./Subscribe"
import * as _ from "lodash"

/*

TODO:
- import maybe just the first 100 contacts.
- consider performance.
- primary key on EAV so all facts are deduped (use UPSERT?).

*/

export function ContactsApp() {
	const bindings = useQuery({
		statements: [
			["?id", "type", "person"],
			["?id", "lastName", "?lastName"],
			["?id", "firstName", "?firstName"],
		],
		sort: [
			["?lastName", 1],
			["?firstName", 1],
			["?id", 1],
		],
	})

	const ids = _.uniq(bindings.map(({ id }) => id).filter(_.isString))

	return (
		<div style={{ display: "flex" }}>
			<div style={{ width: "20em" }}>
				<div>Contacts</div>
				{ids.map((id) => (
					<ContactItem key={id} id={id} />
				))}
			</div>
		</div>
	)
}

function ContactItem(props: { id: string }) {
	return (
		<div>
			<ContactFirstName {...props} />
			<ContactLastName {...props} />
		</div>
	)
}

function ContactFirstName(props: { id: string }) {
	const bindings = useQuery({
		statements: [[props.id, "firstName", "?firstName"]],
	})
	const firstNames = bindings
		.map(({ firstName }) => firstName)
		.filter(_.isString)

	// TODO: conflict resolution
	const firstName = firstNames[0]

	return <span>{firstName}</span>
}

function ContactLastName(props: { id: string }) {
	const bindings = useQuery({
		statements: [[props.id, "lastName", "?lastName"]],
	})
	const lastNames = bindings.map(({ lastName }) => lastName).filter(_.isString)

	// TODO: conflict resolution
	const lastName = lastNames[0]

	return <span>{lastName}</span>
}
