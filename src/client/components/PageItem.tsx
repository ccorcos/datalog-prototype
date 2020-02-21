/*

	PageItem

*/

import * as React from "react"

type PageItemProps = {
	title: string
	owners: Array<string>
	onChangeTitle: (title: string) => void
	onRemoveOwner: (owner: string) => void
	onAddOwner: (owner: string) => void
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
					placeholder="title"
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
				<span>
					[
					{this.props.owners.map(owner => (
						// TODO: intersperse commas

						<React.Fragment key={owner}>
							<strong onClick={() => this.props.onRemoveOwner(owner)}>
								{owner}
							</strong>{" "}
						</React.Fragment>
					))}
					<button
						onClick={() => {
							const newOwner = window.prompt("Owner name:", "")
							if (newOwner) {
								this.props.onAddOwner(newOwner)
							}
						}}
					>
						+
					</button>
					]
				</span>
			</div>
		)
	}

	handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		this.props.onChangeTitle(e.currentTarget.value)
	}
}
