/*

	App

*/

import React from "react"
import { ContactsApp } from "./ContactsApp"
// import { TodoMVC } from "./TodoMVC"
// import { MyEditor } from "./Editor"

type AppProps = {}
type AppState = {}

export class App extends React.Component<AppProps, AppState> {
	constructor(props: AppProps) {
		super(props)
	}

	render() {
		return <ContactsApp />
	}
}
