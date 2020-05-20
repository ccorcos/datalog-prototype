// console.log = () => null

import * as React from "react"
import * as ReactDOM from "react-dom"
import { css } from "glamor"
import { App } from "./components/App"

// Setup the websocket.
import "./components/Subscribe"

css.global("a", {
	color: "inherit",
	textDecoration: "none",
})

css.global("html, body", {
	margin: 0,
})

const root = document.createElement("div")
document.body.appendChild(root)

ReactDOM.render(React.createElement(App), root)
