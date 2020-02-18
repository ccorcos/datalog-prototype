import * as express from "express"
import * as morgan from "morgan"
import * as WebSocket from "ws"
import * as fs from "fs-extra"
import {
	createEmptyDatabase,
	Transaction,
	submitTransaction,
} from "../shared/database/eavStore"
import { AsyncQueue } from "../shared/helpers/AsyncQueue"
import { rootPath } from "../shared/helpers/rootPath"
import { evaluateQuery } from "../shared/database/queryHelpers"
import { randomId } from "../shared/helpers/randomId"
import {
	createSubscription,
	getTransactionBroadcast,
} from "../shared/database/subscriptionHelpers"
import { Message } from "../shared/protocol"

const app = express()

app.use(morgan("dev"))

app.get("/api/hello", (req, res) => {
	res.json({ result: "World!!" })
})

const server = app.listen(8081, () => {
	console.log(`Server is running in http://localhost:8081`)
})

const wss = new WebSocket.Server({ server, path: "/ws" })

const dbPath = rootPath("database.json")
let database = createEmptyDatabase()
try {
	database = JSON.parse(fs.readFileSync(dbPath, "utf8"))
	console.log("Loaded database from disk.")
} catch (error) {
	console.log("Could not load database from disk.")
}

const transactionQueue = new AsyncQueue(1)

const subscriptions = createEmptyDatabase()

const sockets: Record<string, WebSocket> = {}

wss.on("connection", ws => {
	const thisSocketId = randomId()
	sockets[thisSocketId] = ws

	const send = (ws: WebSocket, message: Message) => {
		ws.send(JSON.stringify(message))
	}

	ws.on("message", data => {
		const message: Message = JSON.parse(data.toString())
		if (message.type === "transaction") {
			console.log("<- write")
			transactionQueue.enqueue(async () => {
				submitTransaction(database, message.transaction)
				await fs.writeFile(dbPath, JSON.stringify(database), "utf8")

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
						send(ws, { type: "transaction", transaction })
					}
				}
			})
		} else if (message.type === "subscribe") {
			console.log("<- subscribe")
			// Register the subscription on the client.
			createSubscription(subscriptions, message.query, thisSocketId)
			// Evaluate the query, then send all the relevant facts to the client.
			const results = evaluateQuery(database, message.query)
			const transaction: Transaction = {
				sets: results.facts,
				unsets: [],
			}
			send(ws, { type: "transaction", transaction })
		}
	})

	ws.on("close", () => {
		// TODO: destroy subscriptions.
	})
})
