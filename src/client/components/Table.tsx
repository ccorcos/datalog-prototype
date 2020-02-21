/*

	Table

*/

// TODO:
// build a simple list version. Create a note with attributes and values. edit them. filter them.
// build a simple table UI

import * as React from "react"
import { write, Subscribe } from "./Subscribe"

type TableProps = { username: string }
type TableState = {}

export class Table extends React.Component<TableProps, TableState> {
	state: TableState

	constructor(props: TableProps) {
		super(props)
		this.state = {}
	}

	render() {
		const attributes: Array<Attribute> = []

		const records: Array<Record<string, string>> = []
		return (
			<Subscribe
				query={{
					statements: [["?id", "?attribute", "?value"]],
				}}
				render={bindings => {
					const attributeIds = new Set<string>()
					const results: Record<string, Record<string, Array<string>>> = {}
					for (const binding of bindings) {
						const id = binding.id as string
						const attribute = binding.attribute as string
						const value = binding.value as string
						if (!results[id]) {
							results[id] = {}
						}

						if (!results[id][attribute]) {
							results[id][attribute] = []
						}
						results[id][attribute].push(value)
					}

					return (
						<div>
							<div>
								{attributes.map(attribute => (
									<div>
										<AttributeInput value={attribute} />
									</div>
								))}
							</div>
						</div>
					)
				}}
			/>
		)
	}
}

type Attribute = {
	id: string
	title: string
	type: "number" | "boolean" | "string" | "date"
}

type AttributeInputProps = {
	value: Attribute
}

type AttributeInputState = {}

export class AttributeInput extends React.Component<
	AttributeInputProps,
	AttributeInputState
> {
	state: AttributeInputState

	constructor(props: AttributeInputProps) {
		super(props)
		this.state = {}
	}

	render() {
		return (
			<div>
				<input
					value={this.props.value.title}
					onChange={this.handleChangeTitle}
				/>
				<select onChange={this.handleChangeType} value={this.props.value.type}>
					<option value="">string</option>
					<option value="">number</option>
					<option value="">boolean</option>
				</select>
			</div>
		)
	}

	handleChangeTitle = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { id, title } = this.props.value
		write({
			sets: [[id, "title", e.currentTarget.value]],
			unsets: [[id, "title", title]],
		})
	}

	handleChangeType = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const { id, type } = this.props.value
		write({
			sets: [[id, "type", e.currentTarget.value]],
			unsets: [[id, "type", type]],
		})
	}
}

type ValueInputProps = {
	attribute: Attribute
	id: string
	values: Record<string, string>
}

type ValueInputState = {}

export class ValueInput extends React.Component<
	ValueInputProps,
	ValueInputState
> {
	state: ValueInputState

	constructor(props: ValueInputProps) {
		super(props)
		this.state = {}
	}

	render() {
		const { attribute, values } = this.props
		const value = values[attribute.id] || ""
		return <input value={value} onChange={this.handleChangeValue} />
	}

	handleChangeValue = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { attribute, id, values } = this.props
		const value = values[attribute.id]
		write({
			sets: [[id, attribute.id, e.currentTarget.value]],
			unsets: attribute.id in values ? [[id, attribute.id, value]] : [],
		})
	}
}
