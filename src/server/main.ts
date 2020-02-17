import * as express from "express"
import * as morgan from "morgan"
import * as WebSocket from "ws"

const app = express()

app.use(morgan("dev"))

app.get("/api/hello", (req, res) => {
	res.json({ result: "World!!" })
})

const server = app.listen(8081, () => {
	console.log(`Server is running in http://localhost:8081`)
})

const wss = new WebSocket.Server({ server, path: "/ws" })

wss.on("connection", function connection(ws) {
	console.log("connection")
	ws.on("message", function incoming(message) {
		console.log("message: %s", message)
		ws.send("something")
	})
})
