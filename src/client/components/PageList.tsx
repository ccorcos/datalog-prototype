/*

	PageList

*/

import * as React from "react"
import { Subscribe, write } from "./Subscribe"
import { randomId } from "../../shared/randomId"
import { PageItem } from "./PageItem"

type PageListProps = {
	username: string
}
type PageListState = {}

export class PageList extends React.Component<PageListProps, PageListState> {
	state: PageListState

	constructor(props: PageListProps) {
		super(props)
		this.state = {}
	}

	render() {
		return (
			<div>
				<div>Pages:</div>
				<Subscribe
					query={{
						statements: [
							["?pageId", "owner", this.props.username],
							["?pageId", "owner", "?owner"],
							["?pageId", "title", "?title"],
							["?pageId", "sort", "?sort"],
						],
						sort: [
							["?sort", 1],
							["?pageId", 1],
						],
					}}
					render={bindings => {
						// Process the results, aggregating owners into an array.
						const pages: {
							[pageId: string]: {
								title: string
								sort: number
								owners: Array<string>
							}
						} = {}
						const pageIds: Array<string> = []
						for (const binding of bindings) {
							const pageId = binding.pageId as string
							const owner = binding.owner as string
							if (pageId in pages) {
								pages[pageId].owners.push(owner)
							} else {
								pageIds.push(pageId)
								const title = binding.title as string
								const sort = binding.sort as number
								pages[pageId] = { title, sort, owners: [owner] }
							}
						}

						return (
							<div>
								{pageIds.map((pageId, i) => {
									const { title, sort, owners } = pages[pageId]
									return (
										<PageItem
											key={pageId}
											title={title}
											owners={owners}
											onChangeTitle={newTitle => {
												// In EAV-land, you need to remove old values when you set new
												// values because it's possible to have two values at the same
												// time, unlike SQL.
												write({
													sets: [[pageId, "title", newTitle]],
													unsets: [[pageId, "title", title]],
												})
											}}
											onAddOwner={newOwner => {
												write({
													sets: [[pageId, "owner", newOwner]],
													unsets: [],
												})
											}}
											onRemoveOwner={oldOwner => {
												write({
													sets: [],
													unsets: [[pageId, "owner", oldOwner]],
												})
											}}
											canMoveUp={i > 0}
											onMoveUp={() => {
												// Using fractional indexing to keep track of the order of items.
												// You can learn more about fractional indexing from this Figma blog post:
												// https://www.figma.com/blog/how-figmas-multiplayer-technology-works/
												//
												// TODO: this fractional indexing scheme does has a limited precision. Do
												// something more along the lines of the Figma article.
												const sorts = bindings.map(
													binding => binding.sort as number
												)
												const before = sorts[i - 1]
												const before2 = sorts[i - 2]
												const newSort =
													before2 == undefined
														? before - 1
														: before + (before2 - before) / 2
												// TODO: because more than one owner can be changing the sort order
												// two values could end up with the same sort. In this case, we need
												// to expand the precision and fudge things around. We'll get around
												// to this later.
												if (newSort !== sort) {
													write({
														sets: [[pageId, "sort", newSort]],
														unsets: [[pageId, "sort", sort]],
													})
												}
											}}
											canMoveDown={i < bindings.length - 1}
											onMoveDown={() => {
												const sorts = bindings.map(
													binding => binding.sort as number
												)
												const after = sorts[i + 1]
												const after2 = sorts[i + 2]
												const newSort =
													after2 == undefined
														? after + 1
														: after + (after2 - after) / 2
												if (newSort !== sort) {
													// TODO: because more than one owner can be changing the sort order
													// two values could end up with the same sort. In this case, we need
													// to expand the precision and fudge things around. We'll get around
													// to this later.
													write({
														sets: [[pageId, "sort", newSort]],
														unsets: [[pageId, "sort", sort]],
													})
												}
											}}
										/>
									)
								})}
								<button
									onClick={() => {
										const pageId = randomId()
										let sort = 1
										if (bindings.length > 0) {
											sort += bindings[bindings.length - 1].sort as number
										}
										write({
											sets: [
												[pageId, "owner", this.props.username],
												[pageId, "title", ""],
												[pageId, "sort", sort],
											],
											unsets: [],
										})
									}}
								>
									New Page
								</button>
							</div>
						)
					}}
				/>
			</div>
		)
	}
}
