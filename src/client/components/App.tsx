import * as React from "react"

type AppState = { loading: true } | { loading: false; result: string }

export class App extends React.Component<{}, AppState> {
	state: AppState = { loading: true }
	async componentDidMount() {
		const response = await fetch("/api/hello")
		const { result } = await response.json()
		this.setState({ result, loading: false })
	}
	render() {
		return (
			<div>
				Hello{" "}
				<strong>{this.state.loading ? "(loading)" : this.state.result}</strong>
			</div>
		)
	}
}
