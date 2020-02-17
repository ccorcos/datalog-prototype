/*

	Login

*/

import * as React from "react"

type LoginProps = {
	onLogin: (username: string) => void
}

type LoginState = {
	inputValue: string
}

export class Login extends React.Component<LoginProps, LoginState> {
	state: LoginState

	constructor(props: LoginProps) {
		super(props)
		this.state = { inputValue: "" }
	}

	render() {
		return (
			<div>
				Specify a username to login:
				<input
					value={this.state.inputValue}
					onChange={this.handleInputChange}
					onKeyPress={this.handleKeyPress}
				></input>
				<button onClick={this.handleSubmit}>submit</button>
			</div>
		)
	}

	handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = e.currentTarget.value
		this.setState({ inputValue })
	}

	handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			this.handleSubmit()
		}
	}

	handleSubmit = () => {
		if (this.state.inputValue) {
			this.props.onLogin(this.state.inputValue)
		}
	}
}
