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
const ready = new Promise<void>(resolve => {
	ws.onopen = () => resolve()
})

// Enforce message types and wait for the websocket connection.
async function wsSend(message: Message) {
	await ready
	ws.send(JSON.stringify(message))
}

// Listen for data from the server. Add facts to local cache and
// broadcast updates to all listening <Subscribe/> components.
ws.onmessage = x => {
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
			const component = subscribeComponents[subscribeId]
			component.update()
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
		const component = subscribeComponents[subscribeId]
		component.update()
	}
}

const subscribeComponents: { [subscriptionId: string]: Subscribe } = {}

type SubscribeProps = {
	query: Query
	render: (bindings: Array<Binding>) => React.ReactNode
}
type SubscribeState = {
	bindings: Array<Binding>
}

/**
 * A higher-order component that queries a local-database and subscribes
 * to the server over a websocket.
 */
export class Subscribe extends React.Component<SubscribeProps, SubscribeState> {
	state!: SubscribeState
	id: string

	constructor(props: SubscribeProps) {
		super(props)
		// Register this component with the registry and subscribe.
		this.id = createUuid()
		this.start()
	}

	componentWillUnmount() {
		this.cleanup()
	}

	start() {
		subscribeComponents[this.id] = this
		createSubscription(subscriptions, this.props.query, this.id)
		// Evaluate the query to get the initial state.
		const { bindings } = evaluateQuery(database, this.props.query)
		this.state = { bindings }
		// Create a subscription on the server.
		wsSend({ type: "subscribe", query: this.props.query })
	}

	cleanup() {
		// Cleean up subscription locally.
		destroySubscription(subscriptions, this.props.query, this.id)
		subscribeComponents[this.id]
		wsSend({ type: "unsubscribe", query: this.props.query })
	}

	componentDidUpdate(prevProps: SubscribeProps) {
		if (!_.isEqual(this.props.query, prevProps.query)) {
			this.cleanup()
			this.start()
		}
	}

	update() {
		const { bindings } = evaluateQuery(database, this.props.query)
		this.setState({ bindings })
	}

	render() {
		return this.props.render(this.state.bindings)
	}
}
