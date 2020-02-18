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
import { evaluateQuery, Query } from "../shared/database/queryHelpers"
import { randomId } from "../shared/helpers/randomId"
import {
	createSubscription,
	getTransactionBroadcast,
} from "../shared/database/subscriptionHelpers"
import { Subscribe, Message } from "../shared/protocol"

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

const sockets: Record<string, WebSocket> = {}

wss.on("connection", ws => {
	const thisSocketId = randomId()
	sockets[thisSocketId] = ws

	ws.on("message", data => {
		const message: Message = JSON.parse(data.toString())
		if (message.type === "transaction") {
			console.log("-> Transaction")
			transactionQueue.enqueue(async () => {
				submitTransaction(database, message)
				await fs.writeFile(dbPath, JSON.stringify(database), "utf8")

				const broadcast = getTransactionBroadcast(message)
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
