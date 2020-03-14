/*

	Images

*/

import * as React from "react"
import { DropZone, DropZoneState } from "./DropZone"

type ImagesProps = {
	username: string
}
type ImagesState = {}

export class Images extends React.Component<ImagesProps, ImagesState> {
	state: ImagesState

	constructor(props: ImagesProps) {
		super(props)
		this.state = {}
	}

	render() {
		return (
			<div>
				<div>hello {this.props.username}</div>
				<DropZone onDrop={this.handleDrop} render={this.renderDropZone} />
			</div>
		)
	}

	renderDropZone = ({ dragging }: DropZoneState) => {
		return (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					height: 200,
					width: 200,
					border: "1px solid black",
					background: dragging ? "red" : "#fff",
				}}
			>
				drop here
			</div>
		)
	}

	handleDrop = (file: FileList) => {
		console.log("onDrop")
	}
}
