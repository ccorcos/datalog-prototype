import * as sqlite from "better-sqlite3"
import { Fact } from "../database/eavStore"
import { Expression, Binding } from "../database/queryHelpers"

const bootup = `
CREATE TABLE IF NOT EXISTS eav (entity NUMERIC, attribute NUMERIC, value NUMERIC)
CREATE INDEX IF NOT EXISTS eav_index on eav (entity, attribute, value)
CREATE INDEX IF NOT EXISTS ave_index on eav (attribute, value, entity)
CREATE INDEX IF NOT EXISTS vea_index on eav (value, entity, attribute)
`
	.split("\n")
	.filter(Boolean)

interface Database {
	setFact(fact: Fact): void
	unsetFact(fact: Fact): void
	evaluateExpression(
		expression: Expression
	): { bindings: Array<Binding>; facts: Array<Fact> }
}

export function createEmptyDatabase(dbPath: string): Database {
	const db = sqlite(dbPath)
	for (const cmd in bootup) {
		db.prepare(cmd).run()
	}

	const insert = db.prepare(
		"INSERT INTO eav (entity, attribute, value) VALUES (?, ?, ?)"
	)

	const remove = db.prepare(
		"DELETE FROM eav WHERE entity = ? AND attribute = ? and VALUE = ?"
	)

	const star = db.prepare("SELECT * FROM eav")
	const e = db.prepare("SELECT * FROM eav WHERE entity = ?")
	const a = db.prepare("SELECT * FROM eav WHERE attribute = ?")
	const v = db.prepare("SELECT * FROM eav WHERE value = ?")
	const ea = db.prepare("SELECT * FROM eav WHERE entity = ? AND attribute = ?")
	const av = db.prepare("SELECT * FROM eav WHERE attribute = ? AND value = ?")
	const ve = db.prepare("SELECT * FROM eav WHERE value = ? AND entity = ?")
	const eav = db.prepare(
		"SELECT * FROM eav WHERE entity = ? AND attribute = ? AND value = ?"
	)

	return {
		setFact(fact) {
			insert.run(...fact)
		},
		unsetFact(fact) {
			remove.run(...fact)
		},
		evaluateExpression(expression) {
			const { entity, attribute, value } = expression
			if (entity.type === "known") {
				if (attribute.type === "known") {
					if (value.type === "known") {
						// EAV.
						const facts: Array<Fact> = eav
							.get(entity.value, attribute.value, value.value)
							.map((obj: any) => [obj.entity, obj.attribute, obj.value])

						// Bind the unknowns.
						const bindings = facts.map(() => ({}))
						return { bindings, facts }
					} else {
						// EA_
						const facts: Array<Fact> = ea
							.get(entity.value, attribute.value)
							.map((obj: any) => [obj.entity, obj.attribute, obj.value])

						// Bind the unknowns.
						const bindings = facts.map(([e, a, v]) => {
							return { [value.name]: v }
						})
						return { bindings, facts }
					}
				} else {
					if (value.type === "known") {
						// E_V
						const facts: Array<Fact> = ve
							.get(value.value, entity.value)
							.map((obj: any) => [obj.entity, obj.attribute, obj.value])

						// Bind the unknowns.
						const bindings = facts.map(([e, a, v]) => {
							return { [attribute.name]: a }
						})
						return { bindings, facts }
					} else {
						// E__
						// Warning: this is expensive.
						const facts: Array<Fact> = e
							.get(entity.value)
							.map((obj: any) => [obj.entity, obj.attribute, obj.value])

						// Bind the unknowns.
						const bindings = facts.map(([e, a, v]) => {
							return { [attribute.name]: a, [value.name]: v }
						})
						return { bindings, facts }
					}
				}
			} else {
				if (attribute.type === "known") {
					if (value.type === "known") {
						// _AV
						const facts: Array<Fact> = av
							.get(attribute.value, value.value)
							.map((obj: any) => [obj.entity, obj.attribute, obj.value])

						// Bind the unknowns.
						const bindings = facts.map(([e, a, v]) => {
							return { [entity.name]: e }
						})
						return { bindings, facts }
					} else {
						// _A_
						// Warning: this is expensive.
						const facts: Array<Fact> = a
							.get(attribute.value)
							.map((obj: any) => [obj.entity, obj.attribute, obj.value])

						// Bind the unknowns.
						const bindings = facts.map(([e, a, v]) => {
							return { [value.name]: v, [entity.name]: e }
						})
						return { bindings, facts }
					}
				} else {
					if (value.type === "known") {
						// __V
						// Warning: this is expensive.
						const facts: Array<Fact> = v
							.get(value.value)
							.map((obj: any) => [obj.entity, obj.attribute, obj.value])

						// Bind the unknowns.
						const bindings = facts.map(([e, a, v]) => {
							return { [attribute.name]: a, [entity.name]: e }
						})
						return { bindings, facts }
					} else {
						// ___
						// Warning: this is *very* expensive.
						const facts: Array<Fact> = star
							.get()
							.map((obj: any) => [obj.entity, obj.attribute, obj.value])

						// Bind the unknowns.
						const bindings = facts.map(([e, a, v]) => {
							return { [entity.name]: e, [attribute.name]: a, [value.name]: v }
						})
						return { bindings, facts }
					}
				}
			}
		},
	}
}
