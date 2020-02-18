import { Fact } from "./database"
import { Query } from "./queryHelpers"

export type Transaction = {
	type: "transaction"
	sets: Array<Fact>
	unsets: Array<Fact>
}

export type Subscribe = { type: "subscribe"; query: Query }

export type Protocol = Transaction | Subscribe
