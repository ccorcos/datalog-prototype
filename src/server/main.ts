import * as express from "express"
import * as morgan from "morgan"
import * as WebSocket from "ws"
import * as fs from "fs-extra"
import {
	createEmptyDatabase,
	Transaction,
	submitTransaction,
} from "../shared/database/eavStore"
import { AsyncQueue } from "../shared/AsyncQueue"
import { rootPath } from "../shared/rootPath"
import { evaluateQuery } from "../shared/database/queryHelpers"
import { randomId } from "../shared/randomId"
import {
	createSubscription,
	getTransactionBroadcast,
	destroySubscription,
	destroyAllSubscriptions,
} from "../shared/database/subscriptionHelpers"
import { Message } from "../shared/protocol"
import { unreachable } from "../shared/typeUtils"

const app = express()
app.use(morgan("dev"))

// TODO: REST API.
app.get("/api/hello", (req, res) => {
	res.json({ result: "World!!" })
})

// Start the server.
const server = app.listen(8081, () => {
	console.log(`Server is running in http://localhost:8081`)
})

// Create a websocket server.
const wss = new WebSocket.Server({ server, path: "/ws" })

// Load the database from disk if it exists.
const dbPath = rootPath("database.json")
let database = createEmptyDatabase()
try {
	database = JSON.parse(fs.readFileSync(dbPath, "utf8"))
	console.log("Loaded database from disk.")
} catch (error) {
	console.log("Could not load database from disk.")
}

// Serialize all transactions to make sure that we aren't writing
// the database.json file more than once at a time.
const transactionQueue = new AsyncQueue(1)

// Create an in-memory database for managing websocket subscriptions.
const subscriptions = createEmptyDatabase()

const sockets: { [socketId: string]: WebSocket } = {}

/** A type-safe helper for sending websocket messages */
function wsSend(ws: WebSocket, message: Message) {
	ws.send(JSON.stringify(message))
}

wss.on("connection", ws => {
	// Keep track of an id for each websocket.
	const thisSocketId = randomId()
	sockets[thisSocketId] = ws

	ws.on("message", data => {
		// Handle messages from the client.
		const message: Message = JSON.parse(data.toString())

		if (message.type === "transaction") {
			console.log("<- write")
			// Enqueue a transaction to write serially.
			transactionQueue.enqueue(async () => {
				submitTransaction(database, message.transaction)
				await fs.writeFile(dbPath, JSON.stringify(database), "utf8")

				// Broadcast to relevant subscriptions.
				const broadcast = getTransactionBroadcast(
					subscriptions,
					message.transaction
				)
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
			})
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
			destroySubscription(subscriptions, message.query, thisSocketId)
		} else {
			unreachable(message)
		}
	})

	ws.on("close", () => {
		destroyAllSubscriptions(subscriptions, thisSocketId)
	})
})
