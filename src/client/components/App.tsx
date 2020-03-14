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
import { Images } from "./Images"

type AppProps = {}
type AppState = { loggedIn: false } | LoggedInState

type LoggedInState = {
	loggedIn: true
	username: string
	route: "outliner" | "table" | "list" | "images"
}

export class App extends React.Component<AppProps, AppState> {
	state: AppState

	constructor(props: AppProps) {
		super(props)
		const username = getLoggedInUsername()
		if (username) {
			this.state = { loggedIn: true, username, route: "images" }
		} else {
			this.state = { loggedIn: false }
		}
	}

	render() {
		if (this.state.loggedIn) {
			return (
				<LoggedIn username={this.state.username} onLogout={this.handleLogout}>
					<button
						disabled={this.state.route === "outliner"}
						onClick={() => this.setState({ ...this.state, route: "outliner" })}
					>
						outliner
					</button>
					<button
						disabled={this.state.route === "list"}
						onClick={() => this.setState({ ...this.state, route: "list" })}
					>
						list
					</button>
					<button
						disabled={this.state.route === "table"}
						onClick={() => this.setState({ ...this.state, route: "table" })}
					>
						table
					</button>
					<button
						disabled={this.state.route === "images"}
						onClick={() => this.setState({ ...this.state, route: "images" })}
					>
						images
					</button>
					{this.renderRoute(this.state)}
				</LoggedIn>
			)
		} else {
			return <Login onLogin={this.handleLogin} />
		}
	}

	renderRoute(state: LoggedInState) {
		if (state.route === "table") {
			return <Table username={state.username} />
		} else if (state.route === "list") {
			return <List username={state.username} />
		} else if (state.route === "images") {
			return <Images username={state.username} />
		} else {
			return <PageList username={state.username} />
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
