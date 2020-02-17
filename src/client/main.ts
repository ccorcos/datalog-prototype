import * as React from "react"
import * as ReactDOM from "react-dom"
import { css } from "glamor"
import { App } from "./components/App"
import "./components/Subscribe"

css.global("a", {
	color: "inherit",
	textDecoration: "none",
})

const root = document.createElement("div")
document.body.appendChild(root)

ReactDOM.render(React.createElement(App), root)
