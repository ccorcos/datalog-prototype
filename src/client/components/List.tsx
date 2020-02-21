/*

	List

*/

import * as React from "react"
import { write, Subscribe } from "./Subscribe"
import { randomId } from "../../shared/randomId"
import { Binding } from "../../shared/database/queryHelpers"
import { ListAttributes } from "./ListAttributes"

type ListProps = {
	username: string
}
type ListState = {}

export class List extends React.Component<ListProps, ListState> {
	state: ListState

	constructor(props: ListProps) {
		super(props)
		this.state = {}
	}

	render() {
		return (
			<div>
				<h4>Attributes</h4>
				<ListAttributes />
				<h4>Items</h4>
				<button
					onClick={() => {
						const id = randomId()
						write({
							sets: [[id, "type", "item"]],
							unsets: [],
						})
					}}
				>
					new item
				</button>
				<Subscribe
					query={{
						statements: [["?id", "type", "item"]],
					}}
					render={results => {
						const ids = results.map(result => result.id as string)
						return this.renderItems(ids)
					}}
				/>
			</div>
		)
	}

	renderItems(ids: Array<string>) {
		return (
			<div>
				{ids.map(id => (
					<Subscribe
						key={id}
						query={{
							statements: [
								[id, "?attributeId", "?value"],
								["?attributeId", "type", "attribute"],
								["?attributeId", "title", "?attribute"],
							],
						}}
						render={results => {
							return this.renderItem(id, results)
						}}
					/>
				))}
			</div>
		)
	}

	renderItem(id: string, results: Array<Binding>) {
		return (
			<div
				style={{
					padding: 12,
					marginTop: 6,
					width: "20em",
					borderRadius: 4,
					border: "1px solid #aaa",
				}}
			>
				{results.map(({ attributeId, attribute, value }) => {
					if (attribute === "type") {
						return
					}
					return (
						<div key={attributeId as string}>
							<strong>
								<input
									placeholder="attribute"
									value={attribute as string}
									onChange={e => {
										write({
											sets: [[attributeId, "title", e.currentTarget.value]],
											unsets: [[attributeId, "title", attribute]],
										})
									}}
								/>
								:
							</strong>
							<input
								placeholder="value"
								value={value as string}
								onChange={e => {
									write({
										sets: [[id, attributeId, e.currentTarget.value]],
										unsets: [[id, attributeId, value]],
									})
								}}
							/>
							<button
								onClick={() => {
									write({
										sets: [],
										unsets: [[id, attributeId, value]],
									})
								}}
							>
								delete
							</button>
						</div>
					)
				})}

				<Subscribe
					query={{
						statements: [
							["?id", "type", "attribute"],
							["?id", "title", "?title"],
						],
					}}
					render={results => {
						return (
							<select
								value="new-attribute"
								onChange={e => {
									write({
										sets: [[id, e.currentTarget.value, ""]],
										unsets: [],
									})
								}}
							>
								<option value="new-attribute">new attribute</option>
								{results.map(result => {
									const id = result.id as string
									const title = (result.title as string | undefined) || ""
									return (
										<option key={id} value={id}>
											{title}
										</option>
									)
								})}
							</select>
						)
					}}
				/>
			</div>
		)
	}
}
