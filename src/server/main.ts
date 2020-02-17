import * as express from "express"
import * as morgan from "morgan"

const app = express()

app.use(morgan("dev"))

app.get("/api/hello", (req, res) => {
	res.json({ result: "World!!" })
})

app.listen(8081, () => {
	console.log(`Server is running in http://localhost:8081`)
})
