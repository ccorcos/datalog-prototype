/*

	Subscribe

*/

import * as React from "react"

// query local database
// subscribe over websocket to the server.

console.log(`ws://localhost:8081/ws`)
const ws = new WebSocket(`ws://localhost:8081/ws`)

console.log("starting")
ws.onopen = function open() {
	console.log("open")
	ws.send("something")
}

ws.onmessage = function incoming(data) {
	console.log("message")
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
