import { Transaction } from "./protocol"
import { getSocketsSubscribedToFact } from "./subscriptionHelpers"
import { Database, setFact, unsetFact } from "./database"

export function submitTransaction(
	database: Database,
	transaction: Transaction
) {
	const { sets, unsets } = transaction
	for (const fact of sets) {
		setFact(database, fact)
	}
	for (const fact of unsets) {
		unsetFact(database, fact)
	}
}
type Broadcast = Record<string, Transaction>
export function broadcastTransaction(transaction: Transaction) {
	// Fan out to all listening queries.
	const broadcast: Broadcast = {}
	for (const fact of transaction.sets) {
		const socketIds = getSocketsSubscribedToFact(fact)
		for (const socketId of socketIds) {
			if (!broadcast[socketId]) {
				broadcast[socketId] = {
					type: "transaction",
					sets: [],
					unsets: [],
				}
			}
			broadcast[socketId].sets.push(fact)
		}
	}
	for (const fact of transaction.unsets) {
		const socketIds = getSocketsSubscribedToFact(fact)
		for (const socketId of socketIds) {
			if (!broadcast[socketId]) {
				broadcast[socketId] = {
					type: "transaction",
					sets: [],
					unsets: [],
				}
			}
			broadcast[socketId].unsets.push(fact)
		}
	}
	return broadcast
}
