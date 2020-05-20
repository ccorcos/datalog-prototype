/*

	ContactsApp

*/

import * as React from "react"
import { useQuery } from "./Subscribe"
import * as _ from "lodash"

/*

TODO:
- Performance Stuff:
	- Issue is caused by 1600*2 + 1 subscriptions (for 1600 contacts).
	Solutions:
	1. we could use react-virtualized and use paging.
		 This is not an ideal solution though because this will eventually become
		 a problem somewhere else when we want to load a lot of data.
	2. we can add some logic to detect if we've already queried some data before.
		 Maybe a better approach is to hardcode the queries somewhere so we can
		 simply reuse the top-level query, add a bind statement at the top and
		 the whole thing will get re-used because there's already a query subscription.
		 REALIZATION: this is why a shard key is important -- if this were a full-scaled
		 contacts app, then this reactivity model wouldnt work well if someone wanted to
		 change some contact's name. Thus we'd want to narrow down the scope of the
		 reactivity for that record. And a shard is a natural way to do that. Ideally
		 the shard just represents the user or some permission context.
	Action Plan:
	- Need to upgrade some database stuff.
		- separate query from bindings.
		That's it for now. But there's a lot of other stuff to get to...
		- Paging.
		- Indexing
		- Fix up unsubscribe cleanup
		- Proper tests.
		Maybe we should build out a spec for the database and just churn on that for a little bit.


- UI Query for selected contact.
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
		<div style={{ display: "flex", height: "100vh" }}>
			<div style={{ width: "20em", overflow: "auto" }}>
				<h2
					style={{
						position: "sticky",
						top: 0,
						margin: 0,
						padding: 16,
						background: "white",
					}}
				>
					Contacts
				</h2>
				<div style={{ padding: 16, paddingTop: 0 }}>
					{ids.map((id) => (
						<div>
							<ContactItem key={id} id={id} />
						</div>
					))}
				</div>
			</div>
			<div style={{ padding: 16 }}>Select a contact on the left.</div>
		</div>
	)
}

function ContactItem(props: { id: string }) {
	return (
		<div>
			<ContactFirstName {...props} />{" "}
			<strong>
				<ContactLastName {...props} />
			</strong>
		</div>
	)
}

function ContactFirstName(props: { id: string }) {
	const bindings = useQuery(
		{
			statements: [[props.id, "firstName", "?firstName"]],
		},
		true
	)
	const firstNames = bindings
		.map(({ firstName }) => firstName)
		.filter(_.isString)

	// TODO: conflict resolution
	const firstName = firstNames[0]

	return <span>{firstName}</span>
}

function ContactLastName(props: { id: string }) {
	const bindings = useQuery(
		{
			statements: [[props.id, "lastName", "?lastName"]],
		},
		true
	)
	const lastNames = bindings.map(({ lastName }) => lastName).filter(_.isString)

	// TODO: conflict resolution
	const lastName = lastNames[0]

	return <span>{lastName}</span>
}
