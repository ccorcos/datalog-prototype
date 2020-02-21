/*

	ListAttributes

*/

import * as React from "react"
import { Subscribe, write } from "./Subscribe"
import { randomId } from "../../shared/randomId"

type ListAttributesProps = {}
type ListAttributesState = {}

export class ListAttributes extends React.Component<
	ListAttributesProps,
	ListAttributesState
> {
	state: ListAttributesState

	constructor(props: ListAttributesProps) {
		super(props)
		this.state = {}
	}

	render() {
		return (
			<div>
				<button
					onClick={() => {
						const id = randomId()
						write({
							sets: [
								[id, "type", "attribute"],
								[id, "title", ""],
							],
							unsets: [],
						})
					}}
				>
					new attribute
				</button>
				<Subscribe
					query={{
						statements: [["?id", "type", "attribute"]],
					}}
					render={results => {
						return results.map(result => {
							return this.renderAttribute(result.id as string)
						})
					}}
				/>
			</div>
		)
	}

	renderAttribute(id: string) {
		return (
			<Subscribe
				key={id}
				query={{
					statements: [[id, "title", "?title"]],
				}}
				render={results => {
					const value = results[0]?.title
					const title = (value as string | undefined) || ""
					return (
						<div>
							<input
								placeholder="title"
								value={title}
								onChange={e => {
									write({
										sets: [[id, "title", e.currentTarget.value]],
										unsets: [[id, "title", value]],
									})
								}}
							/>
						</div>
					)
				}}
			/>
		)
	}
}
