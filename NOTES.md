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

Most programmers are familiar with `CREATE INDEX` from SQL and know that it uses a binary tree under the hood, but a lot of programmers are unaware of composite indexes. A composite index is a binary tree index on more than one column. For examplet sort, you might want to list names by last name, then first name, then oldest first. You could do this in SQL with `CREATE INDEX name_age_index ON people (first, last, age desc)`. This kind of thing is really useful when you have a lot of data and complex queries.

When it comes to evaluating a datalog query, we need 3 different composite indexes on our EAV tuples to efficiently evaluate any single query expression:

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

### Evaluation

Evaluating a query is fairly simple:
- iterate through each expression
- determine the index needed to scan to solve for the unknowns
- for each result, substitute the unknowns for the variables in the rest of the expression and recurse...

For example, given the query from above:

```js
["?id", "role", "engineering"]
["?id", "name", "?name"]
```

We solve the first expression, `["?id", "role", "engineering"]`, by scanning the `AVE` index. That gives us a list of ids `Array<{id: string}>`.

Then for the each id, we substitute in the second expression `["?id", "name", "?name"]` and use the `EAV` index to look up the name which leaves us a result of `Array<{id: string, name: string}>`.

### Performance

The order that the expressions are evaluated here is important for performance, but also largely depends on the ontology of data being represented.

A really simple heuristic is to sort expressions by the least number of unknowns to evaluate first. This is almost always the best thing to do, but it entirely depends on the information stored in the database. For example, maybe there are 1M entities with role: engineer, but only 10 entities in the database with a name. There are some things we could do here to improve this heuristic but it's good enough for now.

We can guarantee that this query evaluates in polynomial time - `O(n^z)` where `z` is the number of expressions, and `n` is the size of the largest result set from any single expression. Interestingly, the actual performance of any query drills down to the essential complexity of the underlying information ontology.

## Reactivity

One elegance of Datalog queries is how easy it is to make them reactive.

Given our query from before:

```js
["?id", "role", "engineering"]
["?id", "name", "?name"]
```

If the fact `["6ed62fe2", "name", "Joe"]` was written to the database, we know that our query might have to update because it matches one of our expressions.

How do reactive updates work?
- listeners for a query
- inverse bindings
- re-evaluation

--- HERE

```js
["?id", "role", "engineering"] -> [*, "role", "engineering"]
["?id", "name", "?name"] -> [*, "name", *]
```

Permute every fact 8 ways
```js
["6ed62fe2", "name", "Joe"]
[*, "name", "Joe"]
["6ed62fe2", *, "Joe"]
["6ed62fe2", "name", *]
[*, *, "Joe"]
["6ed62fe2", *, *]
[*, "name", *]
[*, *, *]
```

Query database 8 times.

```js
[*, "name", *] -> ["?id", "name", "?name"]
```

Bind results `{id: "6ed62fe2", name: "Joe"}`

Compute the rest of the query
```js
["6ed62fe2", "role", "engineering"]
```

If this person's role is engineering, then the query needs to update.

Performance:
Every time someone updates a name, we need to recompute this query. That's not great if people are updating names all the time. What we could do is separate these queries into two separate expressions mapped on the client. This makes it more like a key-value lookup. The trade-off here is explicit. Key-value means more subscriptions and client-side load. Larger queries means more communication load. Basically, the performance depends again, entirely on the data ontology.

What is the performance?
How does EXPLAIN work?

Fanout

### Indexes

We can keep queries warm reactively so it's a fast scan. It's a durable cache. Create listeners and thats our indexes update. Sort order determines tuple layout. Query planner can check for shortcuts.

### Rules

Listeners that re-write facts. It's possible this can be implemented purely semantically. But bi-directional links wouldn't work that way.

## Client

Same listener thing for the UI.


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