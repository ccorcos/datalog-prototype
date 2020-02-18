/*

	Protocol.

	A set of types for messages sent over the websocket.

*/

import { Query } from "./database/queryHelpers"
import { Transaction } from "./database/eavStore"

export type Subscribe = { type: "subscribe"; query: Query }

export type Message = Subscribe | Transaction
