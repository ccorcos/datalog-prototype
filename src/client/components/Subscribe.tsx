/*

	Subscribe

*/

import * as React from "react"

// query local database
// subscribe over websocket to the server.

const ws = new WebSocket(`ws://localhost:8081/ws`)

ws.onopen = function open() {
	ws.send("something")
}

ws.onmessage = function incoming(data) {
	console.log(data)
}

type SubscribeProps = {}
type SubscribeState = {}

export class Subscribe extends React.Component<SubscribeProps, SubscribeState> {
	state: SubscribeState

	constructor(props: SubscribeProps) {
		super(props)
		this.state = {}
	}

	render() {
		return <div>hello</div>
	}
}
