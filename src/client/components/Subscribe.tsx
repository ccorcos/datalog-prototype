/*

	Subscribe.

	A higher-order component that queries a local-database and subscribes
	to the server over a websocket.

*/

import * as _ from "lodash"
import * as React from "react"
import { randomId } from "../../shared/helpers/randomId"
import {
	createEmptyDatabase,
	Transaction,
	submitTransaction,
} from "../../shared/database/eavStore"
import {
	destroySubscriptions,
	createSubscription,
	getTransactionBroadcast,
} from "../../shared/database/subscriptionHelpers"
import {
	Query,
	evaluateQuery,
	Binding,
} from "../../shared/database/queryHelpers"
import { Message } from "../../shared/protocol"

// A local cache of only the facts relevant to the client.
const database = createEmptyDatabase()

const ws = new WebSocket(`ws://localhost:8081/ws`)

const ready = new Promise<void>(resolve => {
	ws.onopen = () => resolve()
})

async function wsSend(message: Message) {
	await ready
	ws.send(JSON.stringify(message))
}

ws.onmessage = x => {
	const message: Transaction = JSON.parse(x.data)
	if (message.type === "transaction") {
		console.log("<- write", message)
		submitTransaction(database, message)
		const broadcast = getTransactionBroadcast(message)
		console.log("<- broadcast", broadcast)
		for (const [subscribeId, transaction] of Object.entries(broadcast)) {
			const component = subscribes[subscribeId]
			component.update()
		}
	}
}

export function write(transaction: Transaction) {
	console.log("-> write", transaction)
	submitTransaction(database, transaction)
	wsSend(transaction)
	const broadcast = getTransactionBroadcast(transaction)
	console.log("-> broadcast", broadcast)
	for (const [subscribeId, transaction] of Object.entries(broadcast)) {
		const component = subscribes[subscribeId]
		component.update()
	}
}

const subscribes: Record<string, Subscribe> = {}

type SubscribeProps = {
	query: Query
	render: (bindings: Array<Binding>) => React.ReactNode
}
type SubscribeState = {
	bindings: Array<Binding>
}

export class Subscribe extends React.Component<SubscribeProps, SubscribeState> {
	state: SubscribeState
	id: string

	constructor(props: SubscribeProps) {
		super(props)
		const { bindings } = evaluateQuery(database, this.props.query)
		this.state = { bindings }
		this.id = randomId()
		subscribes[this.id] = this
		createSubscription(this.props.query, this.id)
		// TODO: better types.
		wsSend({ type: "subscribe", query: this.props.query })
	}

	componentWillUnmount() {
		destroySubscriptions(this.props.query, this.id)
		subscribes[this.id]
		// TODO: unsubscribe from remote..
	}

	update() {
		const { bindings } = evaluateQuery(database, this.props.query)
		this.setState({ bindings })
	}

	render() {
		return this.props.render(this.state.bindings)
	}
}
