import * as express from "express"
import * as morgan from "morgan"
import * as WebSocket from "ws"
import * as fs from "fs-extra"
import { Subscribe, Transaction } from "../shared/protocol"
import { emptyDatabase } from "../shared/database"
import { submitTransaction, broadcastTransaction } from "../shared/databaseApi"
import { AsyncQueue } from "../shared/AsyncQueue"
import { rootPath } from "../shared/rootPath"
import { evaluateQuery, Query } from "../shared/queryHelpers"
import { randomId } from "../shared/randomId"
import { createSubscription } from "../shared/subscriptionHelpers"

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
let database = emptyDatabase()
try {
	database = JSON.parse(fs.readFileSync(dbPath, "utf8"))
	console.log("Loaded database from disk.")
} catch (error) {
	console.log("Could not load database from disk.")
}

const transactionQueue = new AsyncQueue(1)

const sockets: Record<string, WebSocket> = {}

wss.on("connection", ws => {
	const thisSocketId = randomId()
	sockets[thisSocketId] = ws

	ws.on("message", data => {
		const message: Subscribe | Transaction = JSON.parse(data.toString())
		if (message.type === "transaction") {
			console.log("-> Transaction")
			transactionQueue.enqueue(async () => {
				submitTransaction(database, message)
				await fs.writeFile(dbPath, JSON.stringify(database), "utf8")

				const broadcast = broadcastTransaction(message)
				for (const [socketId, transaction] of Object.entries(broadcast)) {
					if (socketId === thisSocketId) {
						continue
					} else {
						const ws = sockets[socketId]
						ws.send(JSON.stringify(transaction))
					}
				}
			})
		} else if (message.type === "subscribe") {
			console.log("-> Subscribe")
			// Register the subscription on the client.
			createSubscription(message.query, thisSocketId)
			// Evaluate the query, then send all the relevant facts to the client.
			const results = evaluateQuery(database, message.query)
			const transaction: Transaction = {
				type: "transaction",
				sets: results.facts,
				unsets: [],
			}
			ws.send(JSON.stringify(transaction))
		}
	})

	ws.on("close", () => {
		// TODO: destroy subscriptions.
	})
})
