/*

	PageItem

*/

import * as React from "react"

type PageItemProps = {
	title: string
	owner: string
	onChangeTitle: (title: string) => void
	canMoveUp: boolean
	onMoveUp: () => void
	canMoveDown: boolean
	onMoveDown: () => void
}

type PageItemState = {}

export class PageItem extends React.Component<PageItemProps, PageItemState> {
	state: PageItemState

	constructor(props: PageItemProps) {
		super(props)
		this.state = {}
	}

	render() {
		return (
			<div>
				<input
					value={this.props.title}
					onChange={this.handleChange}
					style={{ width: "20em" }}
				/>
				<button disabled={!this.props.canMoveUp} onClick={this.props.onMoveUp}>
					⬆
				</button>
				<button
					disabled={!this.props.canMoveDown}
					onClick={this.props.onMoveDown}
				>
					⬇
				</button>
				<span>[{this.props.owner}]</span>
			</div>
		)
	}

	handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		this.props.onChangeTitle(e.currentTarget.value)
	}
}
