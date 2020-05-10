/*

	TodoItem

*/

import * as React from "react"
import { Subscribe, write } from "./Subscribe"
import * as _ from "lodash"
import { mergeStrings } from "../../shared/mergeStrings"

type TodoItemProps = { id: string }
type TodoItemState = {}

export class TodoItem extends React.Component<TodoItemProps, TodoItemState> {
	state: TodoItemState

	constructor(props: TodoItemProps) {
		super(props)
		this.state = {}
	}

	render() {
		const { id } = this.props
		return (
			<div>
				<Subscribe
					query={{ statements: [[id, "completed", "?completed"]] }}
					render={(bindings) => {
						const completed = bindings
							.map(({ completed }) => completed)
							.filter(_.isNumber) // bools stored as 0 | 1
							.reduce((a, b) => a || Boolean(b), false)
						return (
							<input
								type="checkbox"
								checked={completed}
								onChange={(e) => {
									write({
										sets: [[id, "completed", e.currentTarget.checked ? 1 : 0]],
										unsets: bindings.map(({ completed }) => [
											id,
											"completed",
											completed,
										]),
									})
								}}
							/>
						)
					}}
				/>

				<Subscribe
					query={{ statements: [[id, "title", "?title"]] }}
					render={(bindings) => {
						const titles = bindings.map(({ title }) => title).filter(_.isString)
						const title = mergeStrings(...titles)
						return (
							<input
								type="text"
								value={title}
								onChange={(e) => {
									write({
										sets: [[id, "title", e.currentTarget.value]],
										unsets: titles.map((title) => [id, "title", title]),
									})
								}}
							/>
						)
					}}
				/>

				<Subscribe
					query={{ statements: [[id, "created_time", "?created_time"]] }}
					render={(bindings) => {
						const createdTimes = bindings
							.map(({ created_time }) => created_time)
							.filter(_.isString)
						// TODO: conflict resolution popup.
						const createdTime = createdTimes[0]
						return <span> {createdTime}</span>
					}}
				/>
			</div>
		)
	}
}
