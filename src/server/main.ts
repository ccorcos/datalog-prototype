import * as express from "express"
import * as morgan from "morgan"

const app = express()

app.use(morgan("dev"))

app.get("/", (req, res) => {
	res.send("Hello World")
})

app.listen(8081, () => {
	console.log(`Server is running in http://localhost:8081`)
})
