import * as express from "express"

const app = express()

app.get("/", (req, res) => {
	res.send("Hello World")
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
	console.log(`Server is running in http://localhost:${PORT}`)
})
