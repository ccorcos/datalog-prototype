/*

	Subscribe

*/

import * as React from "react"
import { emptyDatabase } from "../../shared/database"
import {
	submitTransaction,
	broadcastTransaction,
} from "../../shared/databaseApi"
import { Transaction } from "../../shared/protocol"
import { randomId } from "../../shared/randomId"
import {
	destroySubscriptions,
	createSubscription,
} from "../../shared/subscriptionHelpers"
import { Query, evaluateQuery, Binding } from "../../shared/queryHelpers"

// query local database
// subscribe over websocket to the server.

const ws = new WebSocket(`ws://localhost:8081/ws`)

const database = emptyDatabase()

// ws.onopen = () => {
// 	ws.send("something")
// }

ws.onmessage = ({ data }) => {
	const message: Transaction = JSON.parse(data)
	if (message.type === "transaction") {
		submitTransaction(database, message)
		const broadcast = broadcastTransaction(message)
		for (const [subscribeId, transaction] of Object.entries(broadcast)) {
			const component = subscribes[subscribeId]
			component.forceUpdate()
		}
	}
}

export function write(transaction: Transaction) {
	console.log("write", transaction)
	submitTransaction(database, transaction)
	ws.send(JSON.stringify(transaction))
	const broadcast = broadcastTransaction(transaction)
	console.log("broadcast", broadcast)
	for (const [subscribeId, transaction] of Object.entries(broadcast)) {
		const component = subscribes[subscribeId]
		component.forceUpdate()
	}
}

const subscribes: Record<string, Subscribe> = {}

type SubscribeProps = {
	query: Query
	render: (bindings: Array<Binding>) => React.ReactNode
}
type SubscribeState = {}

export class Subscribe extends React.Component<SubscribeProps, SubscribeState> {
	state: SubscribeState
	id: string

	constructor(props: SubscribeProps) {
		super(props)
		this.state = {}
		this.id = randomId()
		subscribes[this.id] = this
		createSubscription(this.props.query, this.id)
	}

	componentWillUnmount() {
		destroySubscriptions(this.props.query, this.id)
		subscribes[this.id]
	}

	render() {
		const { bindings } = evaluateQuery(database, this.props.query)
		return this.props.render(bindings)
	}
}
