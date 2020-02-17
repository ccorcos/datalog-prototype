/*

	NewComponent

*/

import * as React from "react"

type NewComponentProps = {}
type NewComponentState = {}

export class NewComponent extends React.Component<
	NewComponentProps,
	NewComponentState
> {
	state: NewComponentState

	constructor(props: NewComponentProps) {
		super(props)
		this.state = {}
	}

	render() {
		return <div>hello</div>
	}
}
