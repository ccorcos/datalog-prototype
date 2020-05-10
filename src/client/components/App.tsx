/*

	App

*/

import * as React from "react"
import { TodoMVC } from "./TodoMVC"

type AppProps = {}
type AppState = {}

export class App extends React.Component<AppProps, AppState> {
	constructor(props: AppProps) {
		super(props)
	}

	render() {
		return <TodoMVC />
	}
}
