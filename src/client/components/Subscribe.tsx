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
import {
	TransactionMessage,
	BasicMessage,
	BatchMessage,
} from "../../shared/protocol"
import { BatchedQueue } from "../../shared/BatchedQueue"

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
async function wsSend(message: BasicMessage) {
	return queue.enqueue(message)
}

const queue = new BatchedQueue<BasicMessage, void>(async (messages) => {
	await ready
	const message: BatchMessage = {
		type: "batch",
		messages,
	}
	ws.send(JSON.stringify(message))
	return messages.map(() => undefined)
}, 100)

// Listen for data from the server. Add facts to local cache and
// broadcast updates to all listening <Subscribe/> components.
ws.onmessage = (x) => {
	const message: BatchMessage = JSON.parse(x.data)
	for (const msg of message.messages) {
		const m = msg as TransactionMessage
		if (m.type === "transaction") {
			console.log("<- write", m.transaction)
			const broadcast = submitTransaction({
				subscriptions,
				database,
				transaction: m.transaction,
			})
			console.log("<- broadcast", Object.keys(broadcast).length)
			for (const subscribeId of Object.keys(broadcast)) {
				subscribeComponents[subscribeId]()
			}
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
	localOnly?: boolean
}

export function Subscribe({ query, render, localOnly }: SubscribeProps) {
	return render(useQuery(query, localOnly)) as React.ReactElement
}

function useMemoDeepEqual<T>(value: T) {
	const ref = React.useRef<T>()

	if (!_.isEqual(value, ref.current)) {
		ref.current = value
	}

	return ref.current as T
}

export function useQuery(newQuery: Query, localOnly = false) {
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

		if (!localOnly) {
			// Create a subscription on the server.
			wsSend({ type: "subscribe", query })
		}

		return () => {
			// Cleean up subscription locally.
			destroySubscription(subscriptions, query, id)
			delete subscribeComponents[id]
			if (!localOnly) {
				// TODO: should probably clean up the facts from the in-memory cache.
				wsSend({ type: "unsubscribe", query })
			}
		}
	}, [query, id])

	return bindings
}
