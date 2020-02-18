import { emptyDatabase, setFact, unsetFact, Fact } from "./database"
import {
	Query,
	getListenersForQuery,
	evaluateQuery,
	getListenPatternsForFact,
} from "./queryHelpers"
import { randomId } from "./randomId"

const subscriptions = emptyDatabase()

export function createSubscription(query: Query, socketId: string) {
	const queryId = randomId(JSON.stringify(query))

	setFact(subscriptions, [queryId, "query", JSON.stringify(query)])
	setFact(subscriptions, [queryId, "socketId", socketId])

	const listeners = getListenersForQuery(query)
	for (const { pattern, inverseBinding } of listeners) {
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

export function destroySubscriptions(query: Query, socketId: string) {
	const queryId = randomId(JSON.stringify(query))
	const { bindings } = evaluateQuery(subscriptions, {
		statements: [[queryId, "socketId", "?socketId"]],
		sort: [["?socketId", 1]],
	})

	const remainingSocketIds = bindings
		.map(binding => binding["?socketId"])
		.filter(id => id !== socketId)

	if (remainingSocketIds.length === 0) {
		// Tear down the entire subscription.
		const { facts } = evaluateQuery(subscriptions, {
			statements: [
				[queryId, "socketId", "?socketId"],
				[queryId, "listener", "?listenerId"],
				["?listenerId", "pattern", "?pattern"],
				["?listenerId", "inverseBinding", "?inverseBinding"],
			],
		})
		for (const fact of facts) {
			unsetFact(subscriptions, fact)
		}
	} else {
		// Otherwise, just remove the socket from this subscriptions.
		unsetFact(subscriptions, [queryId, "socketId", socketId])
	}
}

export function getSocketsSubscribedToFact(fact: Fact) {
	const listenPatterns = getListenPatternsForFact(fact)
	const socketIds = new Set<string>()
	for (const pattern of listenPatterns) {
		const { bindings } = evaluateQuery(subscriptions, {
			statements: [
				["?listenerId", "pattern", JSON.stringify(pattern)],
				["?queryId", "listener", "?listenerId"],
				["?queryId", "socketId", "?socketId"],
			],
		})
		for (const binding of bindings) {
			socketIds.add(binding["?socketId"] as string)
		}
	}
	return Array.from(socketIds)
}
