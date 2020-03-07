# Architecture

## Entity-Attribute-Value Tuples

All information is organized into 3-tuples, called *facts*. The three elements in the tuple are called the *entity*, *attribute*, and *value* (EAV). Sometimes, they are referred to as the *subject*, *predicate*, and *object*.

These facts have a semantic resemblence to plain english. For example, *"Chet's age is 29"* might be represented as `["chet", "age", 29]`.

### Data Modeling

One problem with the previous example is that "chet" is not a unique identifier. "chet" is a name and there could be two different people with a the same name.

So instead of using "chet" for the *entity* id, we can use a random id and destructure this into two separate facts.

```js
["edfd670d", "name", "Chet Corcos"]
["edfd670d", "age", 29]
```

### Example

The EAV information model is very flexible and we can encode any datastructure in this fashion. Let's look at a slightly more nontrivial example.

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

When we convert this object to EAV facts, the `id` does't need to be it's own fact because every fact references that `id`. Otherwise the primitive attributes are pretty simple to represent:

```js
["edfd670d", "name", "Chet Corcos"]
["edfd670d", "age", 29]
["edfd670d", "email", "ccorcos@gmail.com"]
```

For the `roles` attribute, we have an unordered list of different roles. To represent this, we simply have two separate facts (a *set* of facts).

Note that an entity can have more than one value for a given attribute! For that reason, it's common for attribute names to be singular.

```js
["edfd670d", "role", "admin"]
["edfd670d", "role", "engineering"]
```

When it comes to ordered lists, we need some additional information to represent the ordering of the items in the set.

There are two ways we can do this.
1. Use a linked-list.
2. Use fractional indexing.

This choice has trade-offs later on in terms of querying, indexing, and how conflicts are resolved. We'll get to that later, but for now, we'll demonstrate a naive fractional indexing implemetation.

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

We'll talk more about this later, but just so you have a basic understanding now: to re-order items in this list, you simply pick a number *in-between* the item before and after where you want it to go and set that to the sort value. Using plain numbers has precision issues, so a better approach is to use a binary string where you can arbitrarily increase the precision. [Figma has a nice blog post outlining how they implement this](https://www.figma.com/blog/realtime-editing-of-ordered-sequences/).

**Question:** Why is this valuable? This looks like a mess compared to the JSON representation.

The main benefit is the simplicity combined with query semantics, reactivity, and indexing power. I'll explain...


## Querying

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

Fundamental to (pretty much) every database is a binary search tree (BST, btree).

---

There's a really good analogy between btrees and physical dictionaries. A dictionary stores all words in alphabetical order. This allows us to look up a work in a dictionary much faster (assuming you know how to spell it) than if the words were arranged by topic or some other order.

A quick way to find a word in a dictionary is called binary search. First you open up the the middle of the dictionary and determine if the word you're looking for is in the left group of pages or the right group of pages. Then you go to half way through the remaining pages and do the same thing.

Each time we repeat this process (also known as an algorithm) we reduce the remaining words we have to scan through by half. This is really powerful because it allows us to sift through huge amounts of information fairly quickly.

Mathematically speaking, if there are *n* words in our dictionary, we should be able to find the word we're looking for in *log_2(n)* amount of steps. Since most people tend to be uncomfortable with logarithms, put another way, in *n* steps, we can search through *2^n* words.

So let's put this in perspective. We can search through 1,000 words in 10 steps, 1,000,000 words in 20 steps, and 1,000,000,000 words in 30 steps! Scientists estimate there are around *2^70* atoms in the entire universe. So if all of that information were ordered in a dictionary (clearly impossible), we'd be able to search through it with only 70 steps of splitting everything in half and choosing which direction we wanted to go.

And don't forget, computers are already really fast! Suffice to say, the binary search tree is a cornerstone of what makes computers as powerful as they are.

---

how to actually make a binary tree
- in memory array with binary search
- on disk with pages and old spinning disk harddrives
- SSDs, Red-Black tree, and AVL trees.
- Persistent data-structures.

What are all the indexes we need?
- eav, ave, vae, etc.

Query planner and evaluator.

Broadcasting updates "efficiently". How efficient?



- Why Datalog?
- How does it work?
- What can you do with it?

- CRDT
- Efficient updates.

What else works like this?
- SPARQL WikiData Semantic Web RDF
- Datomic Datalog Prolog
-