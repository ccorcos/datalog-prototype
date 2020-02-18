/*

	Subscribe

*/

import * as _ from "lodash"
import * as React from "react"
import { emptyDatabase } from "../../shared/database"
import {
	submitTransaction,
	broadcastTransaction,
} from "../../shared/databaseApi"
import { Transaction } from "../../shared/protocol"
import { randomId } from "../../shared/helpers/randomId"
import {
	destroySubscriptions,
	createSubscription,
} from "../../shared/subscriptionHelpers"
import { Query, evaluateQuery, Binding } from "../../shared/queryHelpers"

// query local database
// subscribe over websocket to the server.

const ws = new WebSocket(`ws://localhost:8081/ws`)

const database = emptyDatabase()

const wsPromise = new Promise<WebSocket>(resolve => {
	ws.onopen = () => {
		resolve(ws)
	}
})

async function wsSend(str: string) {
	const ws = await wsPromise
	ws.send(str)
}

ws.onmessage = x => {
	const message: Transaction = JSON.parse(x.data)
	if (message.type === "transaction") {
		console.log("<- write", message)
		submitTransaction(database, message)
		const broadcast = broadcastTransaction(message)
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
	wsSend(JSON.stringify(transaction))
	const broadcast = broadcastTransaction(transaction)
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
		wsSend(JSON.stringify({ type: "subscribe", query: this.props.query }))
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
