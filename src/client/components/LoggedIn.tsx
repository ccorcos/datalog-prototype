/*

	LoggedIn

*/

import * as React from "react"
import { Subscribe, write } from "./Subscribe"
import { randomId } from "../../shared/randomId"

type LoggedInProps = { username: string; onLogout: () => void }

type LoggedInState = {}

export class LoggedIn extends React.Component<LoggedInProps, LoggedInState> {
	state: LoggedInState

	constructor(props: LoggedInProps) {
		super(props)
		this.state = {}
	}

	render() {
		return (
			<div>
				<div>
					You are logged in as <strong>{this.props.username}</strong>
					<button onClick={this.props.onLogout}>logout</button>
				</div>
				<div>
					<div>Pages:</div>
					<Subscribe
						query={{
							statements: [
								["?pageId", "owner", this.props.username],
								["?pageId", "title", "?title"],
								["?pageId", "sort", "?sort"],
							],
							sort: [
								["?sort", 1],
								["?title", 1],
								["?pageId", 1],
							],
						}}
						render={bindings => {
							return (
								<div>
									{bindings.map((binding, i) => {
										return (
											<div key={binding["?pageId"] as string}>
												{binding["?title"]}
												<button
													disabled={i === 0}
													onClick={() => {
														const sorts = bindings.map(
															binding => binding["?sort"] as number
														)
														const before = sorts[i - 1]
														const before2 = sorts[i - 2]
														const newSort =
															before2 == undefined
																? before - 1
																: before + (before2 - before) / 2
														write({
															type: "transaction",
															sets: [[binding["?pageId"], "sort", newSort]],
															unsets: [
																[binding["?pageId"], "sort", binding["?sort"]],
															],
														})
													}}
												>
													move up
												</button>
												<button
													disabled={i === bindings.length - 1}
													onClick={() => {
														const sorts = bindings.map(
															binding => binding["?sort"] as number
														)
														const after = sorts[i + 1]
														const after2 = sorts[i + 2]
														const newSort =
															after2 == undefined
																? after + 1
																: after + (after2 - after) / 2

														console.log("move down", after, after2, newSort)
														write({
															type: "transaction",
															sets: [[binding["?pageId"], "sort", newSort]],
															unsets: [
																[binding["?pageId"], "sort", binding["?sort"]],
															],
														})
													}}
												>
													move down
												</button>
											</div>
										)
									})}
									<button
										onClick={() => {
											const pageId = randomId()
											let sort = 1
											if (bindings.length > 0) {
												sort += bindings[bindings.length - 1]["?sort"] as number
											}
											write({
												type: "transaction",
												sets: [
													[pageId, "owner", this.props.username],
													[pageId, "title", this.props.username + "-" + pageId],
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
			</div>
		)
	}
}
