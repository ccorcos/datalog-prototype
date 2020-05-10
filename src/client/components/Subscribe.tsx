/*

	Subscribe.

*/

import * as _ from "lodash"
import * as React from "react"
import { createUuid } from "../../shared/randomId"
import { createInMemoryDatabase } from "../../shared/database/memory"
import {
	Transaction,
	submitTransaction,
} from "../../shared/database/submitTransaction"
import {
	destroySubscription,
	createSubscription,
} from "../../shared/database/subscriptionHelpers"
import {
	Query,
	evaluateQuery,
	Binding,
} from "../../shared/database/queryHelpers"
import { Message, TransactionMessage } from "../../shared/protocol"

// A local cache of only the facts relevant to the client.
const database = createInMemoryDatabase()

// A separate cache that keeps track of `<Subscribe/>` components.
const subscriptions = createInMemoryDatabase()

// Create a websocket for subscribing to updates from the server.
const ws = new WebSocket(`ws://localhost:8081/ws`)
const ready = new Promise<void>((resolve) => {
	ws.onopen = () => resolve()
})

// Enforce message types and wait for the websocket connection.
async function wsSend(message: Message) {
	await ready
	ws.send(JSON.stringify(message))
}

// Listen for data from the server. Add facts to local cache and
// broadcast updates to all listening <Subscribe/> components.
ws.onmessage = (x) => {
	const message: TransactionMessage = JSON.parse(x.data)
	if (message.type === "transaction") {
		console.log("<- write", message.transaction)
		const broadcast = submitTransaction({
			subscriptions,
			database,
			transaction: message.transaction,
		})
		console.log("<- broadcast", Object.keys(broadcast).length)
		for (const subscribeId of Object.keys(broadcast)) {
			subscribeComponents[subscribeId]()
		}
	}
}

/**
 * Write a transaction optimistically to the local cache, send to the
 * server, and update <Subscribe/> components.
 */
export function write(transaction: Transaction) {
	console.log(" -> write", transaction)
	const broadcast = submitTransaction({
		subscriptions,
		database,
		transaction,
	})
	wsSend({ type: "transaction", transaction })
	console.log(" -> broadcast", Object.keys(broadcast).length)
	for (const subscribeId of Object.keys(broadcast)) {
		subscribeComponents[subscribeId]()
	}
}

const subscribeComponents: { [subscriptionId: string]: () => void } = {}

type SubscribeProps = {
	query: Query
	render: (bindings: Array<Binding>) => React.ReactNode
}

export function Subscribe({ query, render }: SubscribeProps) {
	return render(useQuery(query)) as React.ReactElement
}

function useMemoDeepEqual<T>(value: T) {
	const ref = React.useRef<T>()

	if (!_.isEqual(value, ref.current)) {
		ref.current = value
	}

	return ref.current as T
}

export function useQuery(newQuery: Query) {
	const query = useMemoDeepEqual(newQuery)
	const id = React.useMemo(createUuid, [query])

	const [bindings, setState] = React.useState<Array<Binding>>([])

	React.useEffect(() => {
		// Subscribe.
		subscribeComponents[id] = () => {
			const result = evaluateQuery(database, query)
			setState(result.bindings)
		}
		createSubscription(subscriptions, query, id)

		// Evaluate the query to get the initial state.
		const result = evaluateQuery(database, query)
		setState(result.bindings)

		// Create a subscription on the server.
		wsSend({ type: "subscribe", query })

		return () => {
			// Cleean up subscription locally.
			destroySubscription(subscriptions, query, id)
			delete subscribeComponents[id]
			wsSend({ type: "unsubscribe", query })
		}
	}, [query, id])

	return bindings
}
