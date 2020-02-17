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

type AppProps = {}
type AppState = { loggedIn: false } | { loggedIn: true; username: string }

export class App extends React.Component<AppProps, AppState> {
	state: AppState

	constructor(props: AppProps) {
		super(props)
		const username = getLoggedInUsername()
		if (username) {
			this.state = { loggedIn: true, username }
		} else {
			this.state = { loggedIn: false }
		}
	}

	render() {
		if (this.state.loggedIn) {
			return (
				<LoggedIn username={this.state.username} onLogout={this.handleLogout} />
			)
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
