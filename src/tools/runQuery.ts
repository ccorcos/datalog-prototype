/*

	./node_modules/.bin/ts-node src/tools/runQuery.ts

*/
import * as util from "util"
import { rootPath } from "../shared/rootPath"
import { createSQLiteDatabase } from "../shared/database/sqlite"
import { evaluateQuery } from "../shared/database/queryHelpers"

const dbPath = rootPath("database.json")
console.log(dbPath)
const database = createSQLiteDatabase(rootPath("eav.db"))

const result = evaluateQuery(database, {
	statements: [
		["?id", "type", "person"],
		["?id", "lastName", "?lastName"],
		["?id", "firstName", "?firstName"],
	],
	sort: [
		["?lastName", 1],
		["?firstName", 1],
		["?id", 1],
	],
})

console.log(util.inspect(result.bindings))
