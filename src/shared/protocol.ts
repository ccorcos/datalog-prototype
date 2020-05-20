/*

	Protocol.

	A set of types for messages sent over the websocket.

*/

import { Query } from "./database/queryHelpers"
import { Transaction } from "./database/submitTransaction"

export type SubscribeMessage = { type: "subscribe"; query: Query }

export type UnsubscribeMessage = { type: "unsubscribe"; query: Query }

export type TransactionMessage = {
	type: "transaction"
	transaction: Transaction
}

export type BasicMessage =
	| SubscribeMessage
	| UnsubscribeMessage
	| TransactionMessage

export type BatchMessage = { type: "batch"; messages: Array<BasicMessage> }

export type Message = BasicMessage | BatchMessage
