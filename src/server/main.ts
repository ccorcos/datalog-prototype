import express from "express"
import morgan from "morgan"
import WebSocket from "ws"
import * as fs from "fs-extra"
import * as path from "path"
import { createSQLiteDatabase } from "../shared/database/sqlite"
import {
	Transaction,
	submitTransaction,
} from "../shared/database/submitTransaction"
import { rootPath } from "../shared/rootPath"
import { evaluateQuery } from "../shared/database/queryHelpers"
import { createUuid, isUuid } from "../shared/randomId"
import {
	createSubscription,
	destroySubscription,
	destroyAllSubscriptions,
} from "../shared/database/subscriptionHelpers"
import { Message } from "../shared/protocol"
import { unreachable } from "../shared/typeUtils"
import { createInMemoryDatabase } from "../shared/database/memory"

const app = express()
app.use(morgan("dev"))

// TODO: REST API.
app.get("/api/hello", (req, res) => {
	res.json({ result: "World!!" })
})

function validateFileUrl(url: string) {
	const rest = url.slice("/file/".length).toLowerCase()
	const [id, ext] = rest.split(".")
	if (!id) {
		return { error: "Missing uuid." }
	}
	if (!isUuid(id)) {
		return { error: "Invalid uuid." }
	}
	if (!ext) {
		return { error: "Missing ext." }
	}
	if (!/^[a-z]+$/.test(ext) || ext.length > 10) {
		return { error: "Invalid ext: " + ext }
	}
	return { id, ext }
}

app.put("/file/*", (req, res) => {
	const result = validateFileUrl(req.path)
	if (result.error) {
		res.status(400).send(result.error)
		return
	}
	const { id, ext } = result
	const filename = `${id}.${ext}`
	const tmpFile = path.join("/tmp", filename)
	req.pipe(fs.createWriteStream(tmpFile))
	req.on("end", () => {
		fs.move(tmpFile, rootPath("files", filename))
		res.status(200).send("Thank you!")
	})
})

app.get("/file/*", (req, res) => {
	const result = validateFileUrl(req.path)
	if (result.error) {
		res.status(400).send(result.error)
		return
	}
	const { id, ext } = result
	const filename = `${id}.${ext}`
	const filePath = rootPath("files", filename)
	res.sendFile(filePath)
})

// Start the server.
const server = app.listen(8081, () => {
	console.log(`Server is running in http://localhost:8081`)
})

// Create a websocket server.
const wss = new WebSocket.Server({ server, path: "/ws" })

// Load the database from disk if it exists.
const dbPath = rootPath("database.json")
console.log(dbPath)
const database = createSQLiteDatabase(rootPath("eav.db"))

// Create an in-memory database for managing websocket subscriptions.
const subscriptions = createInMemoryDatabase()

const sockets: { [socketId: string]: WebSocket } = {}

/** A type-safe helper for sending websocket messages */
function wsSend(ws: WebSocket, message: Message) {
	ws.send(JSON.stringify(message))
}

wss.on("connection", (ws) => {
	// Keep track of an id for each websocket.
	const thisSocketId = createUuid()
	sockets[thisSocketId] = ws

	ws.on("message", (data) => {
		// Handle messages from the client.
		const message: Message = JSON.parse(data.toString())

		if (message.type === "transaction") {
			console.log("<- write")
			// Enqueue a transaction to write serially.
			const broadcast = submitTransaction({
				subscriptions,
				database,
				transaction: message.transaction,
			})

			const entries = Object.entries(broadcast).filter(
				([socketId]) => socketId !== thisSocketId
			)
			if (entries.length) {
				console.log(" -> broadcast", entries.length)
				for (const [socketId, transaction] of entries) {
					const ws = sockets[socketId]
					wsSend(ws, { type: "transaction", transaction })
				}
			}
		} else if (message.type === "subscribe") {
			console.log("<- subscribe")

			// Register the subscription for the client.
			createSubscription(subscriptions, message.query, thisSocketId)

			// Evaluate the query, then send all the relevant facts to the client.
			const results = evaluateQuery(database, message.query)
			const transaction: Transaction = {
				sets: results.facts,
				unsets: [],
			}
			wsSend(ws, { type: "transaction", transaction })
		} else if (message.type === "unsubscribe") {
			console.log("<- unsubscribe")
			destroySubscription(subscriptions, message.query, thisSocketId)
		} else {
			unreachable(message)
		}
	})

	ws.on("close", () => {
		destroyAllSubscriptions(subscriptions, thisSocketId)
	})
})
