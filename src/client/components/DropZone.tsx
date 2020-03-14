/*

	DropZone

*/

import * as React from "react"

type DropZoneProps = {
	onDrop: (files: FileList) => void
	render: (state: DropZoneState) => React.ReactNode
}
export type DropZoneState = {
	dragging: boolean
}

export class DropZone extends React.Component<DropZoneProps, DropZoneState> {
	state: DropZoneState

	constructor(props: DropZoneProps) {
		super(props)
		this.state = {
			dragging: false,
		}
	}

	dropRef = React.createRef<HTMLDivElement>()

	componentDidMount() {
		const div = this.dropRef.current
		if (div) {
			div.addEventListener("dragenter", this.handleDragIn)
			div.addEventListener("dragleave", this.handleDragOut)
			div.addEventListener("dragover", this.handleDrag)
			div.addEventListener("drop", this.handleDrop)
		}
	}

	componentWillUnmount() {
		const div = this.dropRef.current
		if (div) {
			div.removeEventListener("dragenter", this.handleDragIn)
			div.removeEventListener("dragleave", this.handleDragOut)
			div.removeEventListener("dragover", this.handleDrag)
			div.removeEventListener("drop", this.handleDrop)
		}
	}

	handleDrag = (e: DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
	}

	private dragCounter: number = 0

	handleDragIn = (e: DragEvent) => {
		this.dragCounter++
		e.preventDefault()
		e.stopPropagation()
		if (e.dataTransfer?.items.length) {
			this.setState({ dragging: true })
		}
	}

	handleDragOut = (e: DragEvent) => {
		this.dragCounter--
		e.preventDefault()
		e.stopPropagation()
		this.setState({ dragging: false })
	}

	handleDrop = (e: DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		this.setState({ dragging: false })
		if (e.dataTransfer?.files.length) {
			this.props.onDrop(e.dataTransfer.files)
			e.dataTransfer.clearData()
			this.dragCounter = 0
		}
	}

	render() {
		return <div ref={this.dropRef}>{this.props.render(this.state)}</div>
	}
}
