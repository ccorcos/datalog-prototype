import { Expression, Binding } from "./queryHelpers"

/**
 * This database only stores simple primative values. You can construct larger
 * data structures from these primative if you want, but you will be responsible
 * for how that conversion works. That way, you have fine grained control over
 * how the CRDT works.
 */
export type DatabaseValue = string | number | boolean

export type Fact = [DatabaseValue, DatabaseValue, DatabaseValue]

export interface Database {
	setFact(fact: Fact): void
	unsetFact(fact: Fact): void
	evaluateExpression(
		expression: Expression
	): { bindings: Array<Binding>; facts: Array<Fact> }
}
