import {
	getSubscriptionUpdates,
	evaluateSubscriptionUpdates,
} from "./subscriptionHelpers"
import { Fact, Database } from "./types"

export type Transaction = {
	sets: Array<Fact>
	unsets: Array<Fact>
}

/**
 * A set of transactions to emit to each subscriptionIds in response
 * to a given transaction.
 */
export type Broadcast = { [subscriptionId: string]: Transaction }

/**
 * Save a set of transactions in batch.
 */
export function submitTransaction(args: {
	subscriptions: Database
	database: Database
	transaction: Transaction
}) {
	const { subscriptions, database, transaction } = args
	const { sets, unsets } = transaction

	// Figure out the subscription updates for the old values.
	const unsetSubscriptionUpdates = getSubscriptionUpdates(subscriptions, unsets)
	const unsetUpdates = evaluateSubscriptionUpdates(
		database,
		unsetSubscriptionUpdates
	)

	// Execute the writes.
	for (const fact of sets) {
		database.setFact(fact)
	}
	for (const fact of unsets) {
		database.unsetFact(fact)
	}

	// Figure out the subscription updates for the new values.
	const setSubscriptionUpdates = getSubscriptionUpdates(subscriptions, sets)

	// Evaluate the query for each subscription with the given fact so that
	// we can determine any other facts that need to go along with the broadcast.
	const setUpdates = evaluateSubscriptionUpdates(
		database,
		setSubscriptionUpdates
	)

	// Fan out to all listening queries.
	const broadcast: Broadcast = {}

	for (const { subscriptionId, facts } of setUpdates) {
		if (!broadcast[subscriptionId]) {
			broadcast[subscriptionId] = {
				sets: [],
				unsets: [],
			}
		}
		broadcast[subscriptionId].sets.push(...facts)
	}

	// Don't send all of the facts associated with the unset because other queries might
	// be using them.
	// TODO: this leads to a memory leak on the client. What we can evaluate the query
	// and just check that each fact is not represented in the query via some other means.
	// This is a good reason to have a lazy evaluate! Then we can early return as soon
	// as there is just one result.
	for (const { subscriptionId, fact } of unsetUpdates) {
		if (!broadcast[subscriptionId]) {
			broadcast[subscriptionId] = {
				sets: [],
				unsets: [],
			}
		}
		broadcast[subscriptionId].unsets.push(fact)
	}

	return broadcast
}
