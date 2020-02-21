# Datalog Prototype

This is a full-stack prototype of collaborate web application backed by a Datalog-inspired database.

## Why is this useful?

Top three reasons:
- Datalog queries are powerful (graph, relational) and semantic.
- All queries are reactive with efficient broadcasting.
- Clients evaluate queries evaluate offline-first with optimistic writes.

Additional reasons:
- Schemaless -- makes data migrations easier.
- Offline sync -- simple primatives for building your own CRDTs.
- Storage agnostic -- works on any sorted key-value store including SQL or DynamoDb.
- Scalable -- event-sourcing for subscriptions and eventually consistent indexes.
- Simple -- this entire demo is ~1500 lines of code.

## How does it work?

The code is fairly well commented so definitely read through it. Just be aware that I built this in one day so I cut some corners.

The core database logic is all inside `src/shared/database`. The main client/server code is `src/client/components/Subscribe.tsx` and `src/server/main.ts`.

The first thing to take a look at is `database/indexHelpers.ts`. Every standard database uses binary trees for storing information and retieving information in O(log n) time. In the interest of time, I implemented a simple in-memory version of a database index and simply write it as JSON to disk. However you could swap this out with an existing storage solution such as SQLite. You could also use LevelDb or DynamoDb but you need to encode the tuples into a lexicographically sortable string. The [`charwise`](https://github.com/dominictarr/charwise) has some good insights for how to do this.

The next layer up the stack is `database/eavStore.ts`. This is just a set of indexes that are useful for evaluating Datalog queries. This information model is really useful and is actually used in many different databases despite there being no good resources for learning about them. Here are some resources to help you learn about it:
- https://github.com/smallhelm/level-fact-base#why-facts
- https://docs.datomic.com/on-prem/indexes.html
- https://en.wikipedia.org/wiki/Entity%E2%80%93attribute%E2%80%93value_model
- http://crubier.github.io/Hexastore/
- https://en.wikipedia.org/wiki/Resource_Description_Framework

`database/queryHelpers.ts` contains all of the logic for evaluating Datalog queries and is surprisingly simple.

`database/subscriptionHelpers.ts` uses `queryHelpers` and `eavStore` to create simple mechanism for determining if a fact changes the result of a query.

`database/submitTransaction.ts` puts everything together to write to the database and return an object describing what updates need to be broadcasted.

`server/main.ts` has all the server logic for creating subscriptions, submitting writes, and broadcasting writes to all relevant clients.

`client/components/Subscribe.tsx` has all complementary client code for optimistically updating the client cache, creating subscriptions with the server, querying the local cache, and broadcasting re-render updates to all relevant components.

One of the most elegant things about this demo is how these abstractions have been reused.
- The main database is an EAV store, however, we also create a separate in-memory EAV store for managing subscriptions!
- The subscription helpers are used for broadcasting updates to all websockets that are subscribed to a query, and this same exact code is used for broadcasting updates to all `<Subscribe/>` components that are rendering the result of a query.
- We use the same query logic on the client and the server so that we can optimistially write to the local cache on the client.

## To Do / What's Next

- Offline sync demo with conflict resolution.
- Lexicographical tuple encoder for use with sorted key-value stores.
- Implement an `explain` command to gain insights into query performance.
- Use subscriptions to implement query indexes.
- Implement on top of DynamoDb + Kinesis for a *really* scalable solution.

- Efficient offline sync checkpoints.
- Better unset broadcast logic.

- Bug with scanIndex prefix searching.