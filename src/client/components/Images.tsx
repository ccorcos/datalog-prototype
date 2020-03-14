/*

	Images

*/

import * as React from "react"
import { DropZone, DropZoneState } from "./DropZone"
import { uploadFile } from "../helpers/uploadFile"
import { createUuid } from "../../shared/randomId"
import { write, Subscribe } from "./Subscribe"

type ImagesProps = {
	username: string
}
type ImagesState = {}

export class Images extends React.Component<ImagesProps, ImagesState> {
	state: ImagesState

	constructor(props: ImagesProps) {
		super(props)
		this.state = {}
	}

	render() {
		return (
			<div>
				<div>hello {this.props.username}</div>
				<div style={{ display: "inline-flex", flexWrap: "wrap" }}>
					<Subscribe
						query={{
							statements: [
								["?id", "type", "file"],
								["?id", "ext", "?ext"],
								["?id", "ready", "?ready"],
								["?id", "name", "?name"],
								["?id", "owner", "?owner"],
								["?id", "alive", 1],
							],
						}}
						render={bindings => {
							return bindings.map(args => {
								const { id, ext, ready, name, owner } = args as any

								let content: React.ReactNode
								if (!ready) {
									content = (
										<div
											style={{
												width: 200,
												height: 200,
												background: "#eed",
											}}
										>
											{name} • {owner}
										</div>
									)
								} else {
									content = (
										<img
											src={`/file/${id}.${ext}`}
											alt={name + " • " + owner}
											style={{
												width: 200,
												height: 200,
												background: "#eed",
											}}
										/>
									)
								}

								return (
									<div
										key={id}
										style={{
											width: 200,
											height: 200,
											position: "relative",
										}}
									>
										{content}
										<div
											style={{
												position: "absolute",
												top: 4,
												right: 4,
												background: "#ccc",
												color: "white",
												borderRadius: "100%",
												width: 24,
												height: 24,
												display: "flex",
												alignContent: "center",
												justifyContent: "center",
											}}
											onClick={() => {
												write({
													sets: [[id, "alive", 0]],
													unsets: [[id, "alive", 1]],
												})
											}}
										>
											x
										</div>
									</div>
								)
							})
						}}
					/>
					<DropZone onDrop={this.handleDrop} render={this.renderDropZone} />
				</div>
			</div>
		)
	}

	renderDropZone = ({ dragging }: DropZoneState) => {
		return (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					height: 200,
					width: 200,
					border: "1px solid black",
					background: dragging ? "red" : "#fff",
				}}
			>
				drop here
			</div>
		)
	}

	handleDrop = async (files: FileList) => {
		await Promise.all(
			Array.from(files).map(async file => {
				const id = createUuid()
				const ext = file.name.split(".")[1]
				write({
					sets: [
						[id, "type", "file"],
						[id, "ext", ext],
						[id, "owner", this.props.username],
						[id, "name", file.name],
						[id, "ready", 0],
						[id, "alive", 1],
					],
					unsets: [],
				})
				console.log("Upload")
				await uploadFile({ id, ext, file })
				console.log("Done")
				write({
					sets: [[id, "ready", 1]],
					unsets: [[id, "ready", 0]],
				})
			})
		)
	}
}
