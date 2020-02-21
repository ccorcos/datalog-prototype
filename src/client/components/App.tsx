/*

	App

*/

import * as React from "react"
import {
	getLoggedInUsername,
	setLoggedInUsername,
	clearLoggedInUsername,
} from "../helpers/loginHelpers"
import { Login } from "./Login"
import { LoggedIn } from "./LoggedIn"
import { PageList } from "./PageList"
import { Table } from "./Table"
import { List } from "./List"

type AppProps = {}
type AppState =
	| { loggedIn: false }
	| { loggedIn: true; username: string; route: "outliner" | "table" | "list" }

export class App extends React.Component<AppProps, AppState> {
	state: AppState

	constructor(props: AppProps) {
		super(props)
		const username = getLoggedInUsername()
		if (username) {
			this.state = { loggedIn: true, username, route: "list" }
		} else {
			this.state = { loggedIn: false }
		}
	}

	render() {
		if (this.state.loggedIn) {
			if (this.state.route === "table") {
				return (
					<LoggedIn username={this.state.username} onLogout={this.handleLogout}>
						<Table username={this.state.username} />
					</LoggedIn>
				)
			} else if (this.state.route === "list") {
				return (
					<LoggedIn username={this.state.username} onLogout={this.handleLogout}>
						<List username={this.state.username} />
					</LoggedIn>
				)
			} else {
				return (
					<LoggedIn username={this.state.username} onLogout={this.handleLogout}>
						<PageList username={this.state.username} />
					</LoggedIn>
				)
			}
		} else {
			return <Login onLogin={this.handleLogin} />
		}
	}

	handleLogin = (username: string) => {
		setLoggedInUsername(username)
		this.setState({ loggedIn: true, username })
	}

	handleLogout = () => {
		clearLoggedInUsername()
		this.setState({ loggedIn: false })
	}
}
