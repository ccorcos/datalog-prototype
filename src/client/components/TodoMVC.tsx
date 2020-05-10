/*

	TodoMVC

*/

import * as React from "react"
import { Subscribe, write } from "./Subscribe"
import * as _ from "lodash"
import { TodoItem } from "./TodoItem"
import { createUuid } from "../../shared/randomId"
import { toDateString } from "../../shared/dateHelpers"

type TodoMVCProps = {}
type TodoMVCState = {}

export class TodoMVC extends React.Component<TodoMVCProps, TodoMVCState> {
	state: TodoMVCState

	constructor(props: TodoMVCProps) {
		super(props)
		this.state = {}
	}

	render() {
		// Lets first try with subscribe and move to something better from there.
		return (
			<Subscribe
				query={{
					statements: [
						["?id", "type", "todo"],
						["?id", "created_time", "?created_time"],
					],
					sort: [
						["?created_time", 1],
						["?id", 1],
					],
				}}
				render={(bindings) => {
					console.log(bindings)
					const ids = bindings.map(({ id }) => id).filter(_.isString)
					return (
						<div>
							<div>Todos</div>
							{ids.map((id) => (
								<TodoItem key={id} id={id} />
							))}
							<button
								onClick={() => {
									const id = createUuid()
									write({
										sets: [
											[id, "type", "todo"],
											[id, "created_time", toDateString(new Date())],
										],
										unsets: [],
									})
								}}
							>
								New Todo
							</button>
						</div>
					)
				}}
			/>
		)
	}
}
