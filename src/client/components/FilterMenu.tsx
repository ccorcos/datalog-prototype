/*

	FilterMenu

*/

import * as React from "react"
import { Subscribe, write } from "./Subscribe"

type FilterMenuProps = {
	onChangeFilters: (filters: Array<Filter>) => void
	filters: Array<Filter>
}
type FilterMenuState = {}

export type Filter = {
	id?: string
	value: string
}

export class FilterMenu extends React.Component<
	FilterMenuProps,
	FilterMenuState
> {
	state: FilterMenuState

	constructor(props: FilterMenuProps) {
		super(props)
		this.state = {}
	}

	render() {
		return (
			<div>
				<button
					onClick={() => {
						this.props.onChangeFilters([{ value: "" }, ...this.props.filters])
					}}
				>
					new filter
				</button>
				<Subscribe
					query={{
						statements: [
							["?id", "type", "attribute"],
							["?id", "title", "?title"],
						],
					}}
					render={results => {
						const attributes: Record<string, string> = {}
						for (const { id, title } of results) {
							attributes[id as string] = title as string
						}
						return (
							<div>
								{this.props.filters.map((filter, i) => {
									return (
										<div key={i}>
											<select
												value={filter.id === undefined ? "none" : filter.id}
												onChange={e => {
													this.props.onChangeFilters(
														this.props.filters.map((filter, j) => {
															if (i === j) {
																return {
																	id: e.currentTarget.value,
																	value: filter.value,
																}
															} else {
																return filter
															}
														})
													)
												}}
											>
												<option value="none">attribute</option>
												{results.map(({ id, title }) => {
													return (
														<option key={id as string} value={id as string}>
															{title}
														</option>
													)
												})}
											</select>
											<input
												placeholder="value"
												value={filter.value}
												onChange={e => {
													this.props.onChangeFilters(
														this.props.filters.map((filter, j) => {
															if (i === j) {
																return {
																	id: filter.id,
																	value: e.currentTarget.value,
																}
															} else {
																return filter
															}
														})
													)
												}}
											/>
											<button
												onClick={() => {
													this.props.onChangeFilters(
														this.props.filters.filter((filter, j) => {
															return i !== j
														})
													)
												}}
											>
												delete
											</button>
										</div>
									)
								})}
							</div>
						)
					}}
				/>
			</div>
		)
	}
}
