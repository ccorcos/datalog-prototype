/*

	LoggedIn

*/

import * as React from "react"
import { PageList } from "./PageList"
type LoggedInProps = { username: string; onLogout: () => void }

type LoggedInState = {}

export class LoggedIn extends React.Component<LoggedInProps, LoggedInState> {
	state: LoggedInState

	constructor(props: LoggedInProps) {
		super(props)
		this.state = {}
	}

	render() {
		return (
			<div>
				<div>
					You are logged in as <strong>{this.props.username}</strong>
					<button onClick={this.props.onLogout}>logout</button>
				</div>
				<PageList username={this.props.username} />
			</div>
		)
	}
}
