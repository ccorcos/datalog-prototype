/*

	TodoItem

*/

import * as React from "react"
import { write, useQuery } from "./Subscribe"
import * as _ from "lodash"
import { mergeStrings } from "../../shared/mergeStrings"

type TodoItemProps = { id: string }

export function TodoItem({ id }: TodoItemProps) {
	return (
		<div>
			<TodoCheckbox id={id} />
			<TodoTitle id={id} />
			<TodoCreatedTime id={id} />
		</div>
	)
}

function TodoCheckbox({ id }: TodoItemProps) {
	const bindings = useQuery({ statements: [[id, "completed", "?completed"]] })

	// TODO: consolidate this logic.
	const completed = bindings
		.map(({ completed }) => completed)
		.filter(_.isNumber) // bools stored as 0 | 1
		.reduce((a, b) => a || Boolean(b), false)

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		write({
			sets: [[id, "completed", e.currentTarget.checked ? 1 : 0]],
			unsets: bindings.map(({ completed }) => [id, "completed", completed]),
		})
	}

	return <input type="checkbox" checked={completed} onChange={handleChange} />
}

function TodoTitle({ id }: TodoItemProps) {
	const bindings = useQuery({ statements: [[id, "title", "?title"]] })

	// TODO: consolidate this logic as well.
	const titles = bindings.map(({ title }) => title).filter(_.isString)
	const title = mergeStrings(...titles)

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		write({
			sets: [[id, "title", e.currentTarget.value]],
			unsets: titles.map((title) => [id, "title", title]),
		})
	}

	return <input type="text" value={title} onChange={handleChange} />
}

function TodoCreatedTime({ id }: TodoItemProps) {
	const bindings = useQuery({
		statements: [[id, "created_time", "?created_time"]],
	})

	// TODO: consolidate this logic as well.
	const createdTimes = bindings
		.map(({ created_time }) => created_time)
		.filter(_.isString)

	// TODO: conflict resolution popup.
	const createdTime = createdTimes[0]
	return <span> {createdTime}</span>
}
