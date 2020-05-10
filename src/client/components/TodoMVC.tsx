/*

	TodoMVC

*/

import * as React from "react"
import { Subscribe, write } from "./Subscribe"
import * as _ from "lodash"
import { TodoItem } from "./TodoItem"
import { createUuid } from "../../shared/randomId"
import { toDateString } from "../../shared/dateHelpers"
import { Fact } from "../../shared/database/types"

type TodoMVCProps = {}
type TodoMVCState = {
	filter: "all" | "checked" | "unchecked"
}

const filterNextMap = {
	all: "unchecked",
	unchecked: "checked",
	checked: "all",
} as const

export class TodoMVC extends React.Component<TodoMVCProps, TodoMVCState> {
	state: TodoMVCState

	constructor(props: TodoMVCProps) {
		super(props)
		this.state = {
			filter: "all",
		}
	}

	render() {
		const extraFilter: Array<Fact> =
			this.state.filter === "all"
				? []
				: this.state.filter === "unchecked"
				? [["?id", "completed", 0]]
				: [["?id", "completed", 1]]

		// Lets first try with subscribe and move to something better from there.
		return (
			<div>
				<div>Todos</div>
				<div>
					Filter:
					<button onClick={this.handleToggleFilter}>{this.state.filter}</button>
				</div>
				<Subscribe
					query={{
						statements: [
							["?id", "type", "todo"],
							["?id", "created_time", "?created_time"],
							...extraFilter,
						],
						sort: [
							["?created_time", 1],
							["?id", 1],
						],
					}}
					render={(bindings) => {
						const ids = bindings.map(({ id }) => id).filter(_.isString)
						return ids.map((id) => <TodoItem key={id} id={id} />)
					}}
				/>
				<button
					onClick={() => {
						const id = createUuid()
						write({
							sets: [
								[id, "type", "todo"],
								[id, "created_time", toDateString(new Date())],
								[id, "completed", 0],
							],
							unsets: [],
						})
					}}
				>
					New Todo
				</button>
			</div>
		)
	}

	handleToggleFilter = () => {
		this.setState({ filter: filterNextMap[this.state.filter] })
	}
}
