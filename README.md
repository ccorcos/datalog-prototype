# Datalog Prototype

This is a full-stack prototype of collaborate web application backed by a Datalog-inspired database.

## Why is this useful?

TODO

- Simple information model. Schemaless. No need for migrations.
- Flexible information model.
	- Can be used for to build CRDT on top.
	- Can be used for graph queries.
- All queries are reactive with efficent broadcasting.
- All queries evaluate offline-first on the client.
- Scalable
	- Works on any sorted key-value store, including Dynamo.
	- Can use eventually-consistent event-sourcing for subscriptions.

## How does it work?

TODO

- EAV Stores
- Listener stuff.
- Client cache.

## TODO

- explain how it works

- permissions for owners
- better unset broadcast logic.

- Offline sync checkpoints

- What's next.