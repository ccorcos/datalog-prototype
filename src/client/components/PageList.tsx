/*

	PageList

*/

import * as React from "react"
import { Subscribe, write } from "./Subscribe"
import { randomId } from "../../shared/helpers/randomId"
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
						return (
							<div>
								{bindings.map((binding, i) => {
									const title = binding.title as string
									const pageId = binding.pageId as string
									const sort = binding.sort as number
									const owner = binding.owner as string
									return (
										<PageItem
											key={pageId}
											title={title}
											owner={owner}
											onChangeTitle={newTitle => {
												// In EAV-land, you need to remove old values when you set new
												// values because it's possible to have two values at the same
												// time, unlike SQL.
												write({
													sets: [[pageId, "title", newTitle]],
													unsets: [[pageId, "title", title]],
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
												write({
													sets: [[pageId, "sort", newSort]],
													unsets: [[pageId, "sort", sort]],
												})
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
												write({
													sets: [[pageId, "sort", newSort]],
													unsets: [[pageId, "sort", sort]],
												})
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
												[pageId, "title", "Untitled"],
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
