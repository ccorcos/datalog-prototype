# Architecture

## Entity-Attribute-Value Tuples

All information is organized into 3-tuples, called *facts*. The three elements in the tuple are called the *entity*, *attribute*, and *value* (EAV). If you're googling around for this stuff, sometimes they are referred to as the *subject*, *predicate*, and *object*.

These facts have a semantic resemblence to plain english. For example, *"Chet's age is 29"* might be represented as `["chet", "age", 29]`.

### Data Modeling

One problem with the previous example is that "chet" is not necessarily unique identifier. "chet" is a name and there could be two different people with a the same name.

So instead of using "chet" for the *entity* id, we can use a random id and destructure this into two separate facts.

```js
["edfd670d", "name", "Chet Corcos"]
["edfd670d", "age", 29]
```

### Example

The EAV information model is very flexible and we can represent any data structure this way. Let's look at a slightly more nontrivial example.

Here's an example of a JSON user record:

```js
{
	id: "edfd670d",
	name: "Chet Corcos",
	age: 29,
	email: "ccorcos@gmail.com",
	// An unordered set of different permissions/roles.
	roles: ["admin", "engineering"],
	// An ordered list of references to other entities.
	bookmarks: ["44e9cdb5","404e792d","2d208b70"]
}
```

When we convert this object to EAV facts, the `id` doesn't need to be it's own fact because every fact references that `id`. The other primitive attributes are pretty simple to represent:

```js
["edfd670d", "name", "Chet Corcos"]
["edfd670d", "age", 29]
["edfd670d", "email", "ccorcos@gmail.com"]
```

For the `roles` attribute, we have an *unordered list* of different roles. To represent this, we simply have two separate facts (a *set* of facts).

Note that an entity can have more than one value for a given attribute! For that reason, it makes sense for attribute names to be singular.

```js
["edfd670d", "role", "admin"]
["edfd670d", "role", "engineering"]
```

When it comes to ordered lists, we need some additional information to represent the ordering of the items in the set.

There are two ways we can do this.
1. Use a linked-list.
2. Use fractional indexing.

This choice has trade-offs later on in terms of querying, indexing, and how conflicts are resolved. We'll get to that later, but for now, we'll demonstrate fractional indexing.

```js
["edfd670d", "bookmark", "868bb9ff"]
["868bb9ff", "value", "44e9cdb5"]
["868bb9ff", "sort", 0]

["edfd670d", "bookmark", "5e04349c"]
["5e04349c", "value", "404e792d"]
["5e04349c", "sort", 1]

["edfd670d", "bookmark", "0eaebc3e"]
["0eaebc3e", "value", "2d208b70"]
["0eaebc3e", "sort", 2]
```

Each bookmark references an entity that encapsulates both a value and a sort.

We'll talk more about this later, but just so you have a basic understanding of fractional indexing: to re-order items in this list, you simply pick a sort number *in-between* where you want it to go. Using floats has precision issues, so a better approach is to use a binary string where you can arbitrarily increase the precision. [Figma has a nice blog post outlining how they implement this](https://www.figma.com/blog/realtime-editing-of-ordered-sequences/).

## Querying

Querying data in this format is pretty simple and it feels a lot like pattern matching.

Suppose we want to find all engineers in our organization. You would do that with a query that looks like this:

```js
["?id", "role", "engineering"]
["?id", "name", "?name"]
```

Anything that starts with a `?` is considered a variable and the query engine will try to find all sets of variables that satisfy ANDing all expressions in the query. For example, the result of this query will look something like this:

```js
[
	{id: "0eaebc3e", name: "Chet Corcos"},
	{id: "3daeb70b", name: "Simon Last"}
]
```

One way to think about Datalog is one giant SQL table.

```sql
select id, name from data
where role = 'engineering'
```

A huge difference with Datalog is that role can be more than one value. With Postgres you can use a list type with a gin not all SQL engines offer this. Not to mention, Postgres doesn't run in the browser!

Another big difference is that there are no table joins! For example, this query will find all of my cousins:

```js
["0eaebc3e", "parent", "?parent"]
["?parent", "sibling", "?sibling"]
["?cousin", "parent", "?sibling"]
```

Writing this as a SQL statement would not be very fun. Its worth mentioning that almost all graph databases rely on this sort of data-model under the hood.

You might also be wondering what if we wanted the last clause to be `["?sibling", "child", "?cousin"]`. We will talk about this later when we cover the concepts behind *rules*, but the short answer is, yes, you can do this -- it's just semantics.

### EAV Indexes

Binary search is fundamental to pretty much every database and allow for the retreival of information in `O(log n)` time.

Most programmers are familiar with `CREATE INDEX` from SQL and know that it uses a binary tree under the hood, but a lot of programmers are unaware of composite indexes. A composite index is a binary tree index on more than one column -- think of it as a secondary column sort. For example `CREATE INDEX name_age ON people (name, age desc)` will create an ordered tree of people based on name and  everyone with the same name will be ordered by oldest-first. This kind of thing is really useful when you have a lot of data and complex queries.

When it comes to evaluating a query, we need 3 different indexes on our EAV tuples to efficiently evaluate any single query expression. Here they are:

- `EAV`

	Used for expressions such as `["0eaebc3e", "name", "?name"]` and `["0eaebc3e", "?attr", "?value"]`.

	This lets you look up a value for a known id and attribute. For example, you can look up the name of a given entity.

	It also lets you look up all attribute-value pairs for a given entity. For example, you might want to look up all attribute-value pairs for a user to construct a JSON object.

- `AVE`

	Used for expressions such as `["?id", "email", email]` and `["?id", "email", "?email"]`.

	This let's you look up an entity based on an attribute-value pair. For example, you can look up a user by email.

	It also lets you list all entity-value pairs for a given attribute. For example, you can list all email addresses with corresponding entities.

- `VEA`

	Used for expressions like `["?person", "?relationship", "0eaebc3e"]`.

	This lets you find all inverse-relationships to an entity.


How does the query planner work?
- evaluating a 2-expression query
- re-ordering expression and optimal evaluation

What is the performance?
How does EXPLAIN work?

## Broadcasting

How do reactive updates work?
- listeners for a query
- inverse bindings
- re-evaluation

What is the performance?
How does EXPLAIN work?

### Indexes

### Rules

## Collaboration

- Permissions

### CRDT





do we explain indexes first? or explain how the query planner works?

explain queries first. then explain how it works.

---

https://docs.datomic.com/on-prem/indexes.html


Let's walk through how a querying this information works. Suppose want to know a list of names of all engineers. The query itself might be written like this:

```js
[unknown("id"), "role", "engineering"]
[unknown("id"), "name", unknown("name")]
```

In order to evaluate this query, we first need to cover the basics of database indexing and then talk a little bit about how a query planner works.


---

how to actually make a binary tree
- in memory array with binary search
- on disk with pages and old spinning disk harddrives
- SSDs, Red-Black tree, and AVL trees.
- Persistent data-structures.

What are all the indexes we need?
- eav, ave, vae, etc.

Query planner and evaluator.



- Why Datalog?
- How does it work?
- What can you do with it?

- CRDT
- Efficient updates.

What else works like this?
- SPARQL WikiData Semantic Web RDF
- Datomic Datalog Prolog
-