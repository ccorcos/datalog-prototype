/*

	subscriptionHelpers.

	Logic that determins if a fact should dispatch an update to a subscribed query.

*/

import { DatabaseValue, Fact, Database } from "./types"
import {
	Query,
	evaluateQuery,
	Unknown,
	statementsToClause,
	Binding,
} from "./queryHelpers"
import { randomId } from "../randomId"

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
	subscriptions.setFact([queryId, "query", JSON.stringify(query)])
	subscriptions.setFact([queryId, "subscriptionId", subscriptionId])

	// Save each listener with a pointer back to the query.
	const listeners = getListenersForQuery(query)
	for (const { pattern, inverseBinding } of listeners) {
		// TODO: `listenerId` could be deterministic, but then we need to differentiate
		// the inverse binding for each listener-query combination.
		const listenerId = randomId()
		subscriptions.setFact([queryId, "listener", listenerId])
		subscriptions.setFact([listenerId, "pattern", JSON.stringify(pattern)])
		subscriptions.setFact([
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
			subscriptions.unsetFact(fact)
		}
	} else {
		// Otherwise, just remove the subscriptionId from this query.
		subscriptions.unsetFact([queryId, "subscriptionId", subscriptionId])
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

type SubscriptionUpdate = {
	fact: Fact
	subscriptionId: string
	query: Query
	inverseBinding: InverseBinding
}

/**
 * Determine which subscriptions depend on the given fact.
 */
export function getSubscriptionUpdates(
	subscriptions: Database,
	facts: Array<Fact>
) {
	const results: Array<SubscriptionUpdate> = []
	for (const fact of facts) {
		const listenPatterns = getListenPatternsForFact(fact)

		for (const pattern of listenPatterns) {
			const { bindings } = evaluateQuery(subscriptions, {
				statements: [
					["?queryId", "query", "?query"],
					["?queryId", "subscriptionId", "?subscriptionId"],
					["?queryId", "listener", "?listenerId"],
					["?listenerId", "pattern", JSON.stringify(pattern)],
					["?listenerId", "inverseBinding", "?inverseBinding"],
				],
			})
			for (const result of bindings) {
				const subscriptionId = result.subscriptionId as string
				const query: Query = JSON.parse(result.query as string)
				const inverseBinding: InverseBinding = JSON.parse(
					result.inverseBinding as string
				)
				results.push({ subscriptionId, query, inverseBinding, fact })
			}
		}
	}
	return results
}

export function evaluateSubscriptionUpdates(
	database: Database,
	updates: Array<SubscriptionUpdate>
) {
	// TODO: create an efficient `Map<string, Set<Fact>>` abstraction.
	const results: Array<{
		subscriptionId: string
		fact: Fact
		facts: Array<Fact>
	}> = []

	for (const { inverseBinding, fact, query, subscriptionId } of updates) {
		// Figure out what unknowns to resolve inside the query.
		const resolveBindings: Binding = {}
		for (let i = 0; i < inverseBinding.length; i++) {
			const unknown = inverseBinding[i]
			if (unknown !== null) {
				resolveBindings[unknown.name] = fact[i]
			}
		}

		// Replace the unknowns in the Query to effectively solve for the inverse.
		const inverseQuery: Query = {
			statements: query.statements.map(statement => {
				return statement.map(token => {
					if (typeof token !== "string") {
						return token
					}
					if (token.startsWith("?")) {
						const unknownName = token.slice(1)
						if (unknownName in resolveBindings) {
							return resolveBindings[unknownName]
						}
					}
					return token
				}) as Fact
			}),
		}

		const { facts } = evaluateQuery(database, inverseQuery)
		if (facts.length) {
			results.push({ subscriptionId, fact, facts })
		}
	}
	return results
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
