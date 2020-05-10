/*

	TodoMVC

*/

import * as React from "react"
import { write, useQuery } from "./Subscribe"
import * as _ from "lodash"
import { TodoItem } from "./TodoItem"
import { createUuid } from "../../shared/randomId"
import { toDateString } from "../../shared/dateHelpers"
import { Fact } from "../../shared/database/types"

type TodoFilters = "all" | "checked" | "unchecked"

const filterNextMap: Record<TodoFilters, TodoFilters> = {
	all: "unchecked",
	unchecked: "checked",
	checked: "all",
}

const filterQueryMap: Record<TodoFilters, Array<Fact>> = {
	all: [],
	unchecked: [["?id", "completed", 0]],
	checked: [["?id", "completed", 1]],
}

export function TodoMVC() {
	const [filter, setFilter] = React.useState<TodoFilters>("all")

	const handleToggleFilter = React.useCallback(() => {
		setFilter(filterNextMap[filter])
	}, [filter])

	const handleNewTodo = React.useCallback(() => {
		const id = createUuid()
		write({
			sets: [
				[id, "type", "todo"],
				[id, "created_time", toDateString(new Date())],
				[id, "completed", 0],
			],
			unsets: [],
		})
	}, [])

	const bindings = useQuery({
		statements: [
			["?id", "type", "todo"],
			["?id", "created_time", "?created_time"],
			...filterQueryMap[filter],
		],
		sort: [
			["?created_time", 1],
			["?id", 1],
		],
	})

	// Its possible that there's more than one created_time and we also don't know
	// that all the ids are strings as we expect. So we need to filter these down.
	const ids = _.uniq(bindings.map(({ id }) => id).filter(_.isString))

	return (
		<div>
			<div>Todos</div>
			<div>
				Filter: <button onClick={handleToggleFilter}>{filter}</button>
			</div>
			{ids.map((id) => (
				<TodoItem key={id} id={id} />
			))}
			<button onClick={handleNewTodo}>New Todo</button>
		</div>
	)
}
