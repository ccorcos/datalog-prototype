/*

	subscriptionHelpers.

	Logic that determins if a fact should dispatch an update to a subscribed query.

*/

import { setFact, unsetFact, Fact, Transaction, Database } from "./eavStore"
import {
	Query,
	evaluateQuery,
	Unknown,
	statementsToClause,
} from "./queryHelpers"
import { randomId } from "../helpers/randomId"
import { DatabaseValue } from "./indexHelpers"

/**
 * Registers the query listeners for a given `subscriptionId`.
 */
export function createSubscription(
	subscriptions: Database,
	query: Query,
	subscriptionId: string
) {
	// `queryId` is deterministic.
	const queryId = randomId(JSON.stringify(query))

	// Save the query and the subscription that points to it.
	setFact(subscriptions, [queryId, "query", JSON.stringify(query)])
	setFact(subscriptions, [queryId, "subscriptionId", subscriptionId])

	// Save each listener with a pointer back to the query.
	const listeners = getListenersForQuery(query)
	for (const { pattern, inverseBinding } of listeners) {
		// TODO: `listenerId` could be deterministic, but then we need to differentiate
		// the inverse binding for each listener-query combination.
		const listenerId = randomId()
		setFact(subscriptions, [queryId, "listener", listenerId])
		setFact(subscriptions, [listenerId, "pattern", JSON.stringify(pattern)])
		setFact(subscriptions, [
			listenerId,
			"inverseBinding",
			JSON.stringify(inverseBinding),
		])
	}
}

/**
 * Remove the subscription from for the given query and remove all query listeners
 * if there are no more subscriptions for that query.
 */
export function destroySubscription(
	subscriptions: Database,
	query: Query,
	subscriptionId: string
) {
	// `queryId` is deterministic.
	const queryId = randomId(JSON.stringify(query))

	// Check if there other subscriptions for this query.
	const { bindings } = evaluateQuery(subscriptions, {
		statements: [[queryId, "subscriptionId", "?subscriptionId"]],
		sort: [["?subscriptionId", 1]],
	})

	const subscriptionIds = bindings
		.map(binding => binding.subscriptionId)
		.filter(id => id !== subscriptionId)

	if (subscriptionIds.length === 0) {
		// Tear down the entire subscription if there are no more subscriptions.
		const { facts } = evaluateQuery(subscriptions, {
			statements: [
				[queryId, "subscriptionId", "?subscriptionId"],
				[queryId, "listener", "?listenerId"],
				["?listenerId", "pattern", "?pattern"],
				["?listenerId", "inverseBinding", "?inverseBinding"],
			],
		})
		for (const fact of facts) {
			unsetFact(subscriptions, fact)
		}
	} else {
		// Otherwise, just remove the subscriptionId from this query.
		unsetFact(subscriptions, [queryId, "subscriptionId", subscriptionId])
	}
}

/**
 * Remove all subscriptions for a given subscriptionId.
 */
export function destroyAllSubscriptions(
	subscriptions: Database,
	subscriptionId: string
) {
	// Check if there other subscriptions for this query.
	const { bindings } = evaluateQuery(subscriptions, {
		statements: [
			["?queryId", "subscriptionId", subscriptionId],
			["?queryId", "query", "?query"],
		],
	})
	for (const binding of bindings) {
		const query = binding.query as string
		destroySubscription(subscriptions, JSON.parse(query), subscriptionId)
	}
}

/**
 * Determine which subscriptions depend on the given fact.
 */
function getSubscriptionsToFact(subscriptions: Database, fact: Fact) {
	const listenPatterns = getListenPatternsForFact(fact)
	const subscriptionIds = new Set<string>()
	for (const pattern of listenPatterns) {
		const { bindings } = evaluateQuery(subscriptions, {
			statements: [
				["?listenerId", "pattern", JSON.stringify(pattern)],
				["?queryId", "listener", "?listenerId"],
				["?queryId", "subscriptionId", "?subscriptionId"],
			],
		})
		for (const binding of bindings) {
			subscriptionIds.add(binding.subscriptionId as string)
		}
	}
	return subscriptionIds
}

/**
 * A set of transactions to emit to each subscriptionIds in response
 * to a given transaction.
 */
export type Broadcast = { [subscriptionId: string]: Transaction }

/**
 * Logic for broadcasting updates to each subscriber.
 */
export function getTransactionBroadcast(
	subscriptions: Database,
	transaction: Transaction
) {
	// Fan out to all listening queries.
	const broadcast: Broadcast = {}
	for (const fact of transaction.sets) {
		const subscriptionIds = getSubscriptionsToFact(subscriptions, fact)
		for (const subscriptionId of subscriptionIds) {
			if (!broadcast[subscriptionId]) {
				broadcast[subscriptionId] = {
					sets: [],
					unsets: [],
				}
			}
			broadcast[subscriptionId].sets.push(fact)
		}
	}
	for (const fact of transaction.unsets) {
		const subscriptionIds = getSubscriptionsToFact(subscriptions, fact)
		for (const subscriptionId of subscriptionIds) {
			if (!broadcast[subscriptionId]) {
				broadcast[subscriptionId] = {
					sets: [],
					unsets: [],
				}
			}
			broadcast[subscriptionId].unsets.push(fact)
		}
	}
	return broadcast
}

export type ListenPattern = Array<DatabaseValue | null>

export type InverseBinding = Array<Unknown | null>

/**
 * A query such as `["chet", "friend", "?chetsFriend"]` will generate many
 * `ListenPattern`s.
 *
 * One such pattern will look like `["chet", "friend", null]`
 * which will be "triggered" when a fact is written to the database that
 * matches the pattern such as `["chet", "friend", "simon"]`.
 *
 * The inverse binding is used to map the wildcards into variable names
 * specific to the query.
 *
 * For example, `[null, null, {type: "unknown", name: "chetsFriend"}]`
 * and thus the listener will "fire" with a binding `{chetsFriend: "simon"}`.
 */
export type Listener = {
	pattern: ListenPattern
	inverseBinding: InverseBinding
}

/**
 * Get all the listeners necessary to subscribe to a query.
 */
export function getListenersForQuery(query: Query) {
	const clause = statementsToClause(query.statements)
	const listeners: Array<Listener> = []

	for (const expression of clause) {
		const listener: Listener = { pattern: [], inverseBinding: [] }
		if (expression.entity.type === "known") {
			listener.pattern.push(expression.entity.value)
			listener.inverseBinding.push(null)
		} else {
			listener.pattern.push(null)
			listener.inverseBinding.push(expression.entity)
		}

		if (expression.attribute.type === "known") {
			listener.pattern.push(expression.attribute.value)
			listener.inverseBinding.push(null)
		} else {
			listener.pattern.push(null)
			listener.inverseBinding.push(expression.attribute)
		}

		if (expression.value.type === "known") {
			listener.pattern.push(expression.value.value)
			listener.inverseBinding.push(null)
		} else {
			listener.pattern.push(null)
			listener.inverseBinding.push(expression.value)
		}
		listeners.push(listener)
	}

	return listeners
}

/**
 * Given a fact, permute all `ListenPattern`s to trigger.
 * For example: `["chet", "friend", "simon"]` will result in the
 * following 8 `ListenPattern`s:
 * - `["chet", "friend", "simon"]` // Listening to exactly this fact.
 * - `["chet", "friend", null]`
 * - `["chet", null, "simon"]`
 * - `["chet", null, null]`
 * - `[null, "friend", "simon"]`
 * - `[null, "friend", null]`
 * - `[null, null, "simon"]`
 * - `[null, null, null]` // Listening to all facts.
 */
export function getListenPatternsForFact(fact: Fact) {
	const listenKeys: Array<ListenPattern> = []
	for (const entity of [true, false]) {
		for (const attribute of [true, false]) {
			for (const value of [true, false]) {
				listenKeys.push([
					entity ? fact[0] : null,
					attribute ? fact[1] : null,
					value ? fact[2] : null,
				])
			}
		}
	}
	return listenKeys
}
