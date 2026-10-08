# Module 1 - Origins & Lineage

> **Prerequisites:** Basic JavaScript and a passing familiarity with Observables (you have called `.subscribe()` at least once).
>
> **What you'll learn:** The intellectual chain that produced RxJS, from mathematical set notation to a push-based JavaScript library, and the single insight that ties it all together.

RxJS did not appear out of nowhere. It is the latest link in a chain of ideas that stretches back to pure mathematics. Understanding that chain is the fastest way to stop memorizing operators and start *deriving* them, because every design decision in RxJS is inherited from somewhere upstream.

---

## The chain

```
Set Builder Notation  →  Haskell List Comprehensions  →  Microsoft LINQ  →  Rx.NET  →  RxJS
     (mathematics)            (lazy functional)          (query any source)  (push)   (push in JS)
```

Each step kept the same core idea - *declaratively describe a transformed collection* - and generalized it to a new context.

---

## Step 0: Set builder notation (mathematics)

Mathematicians have described derived collections for centuries using **set builder notation**:

```
{ x² | x ∈ ℕ, x > 3 }
```

Read aloud: "the set of `x` squared, where `x` is a natural number and `x` is greater than 3." It decomposes cleanly into three parts, and those three parts are *exactly* the shape of a modern RxJS pipeline:

| Fragment     | Role      | RxJS analogue |
|--------------|-----------|---------------|
| `x²`         | transform | `map(x => x * x)` |
| `x ∈ ℕ`      | source    | the Observable itself |
| `x > 3`      | filter    | `filter(x => x > 3)` |

The notation is **declarative**: it says *what* the set is, not *how* to build it element by element. That declarative stance survives all the way to RxJS.

---

## Step 1: Haskell list comprehensions (lazy functional)

Haskell made set builder notation executable:

```haskell
[ x^2 | x <- [1..10], x > 3 ]
-- [16,25,36,49,64,81,100]
```

The syntax is deliberately almost identical to the mathematics. Haskell added one profound idea: **lazy evaluation**. A list is not computed until something demands its elements, and only as many elements as are demanded. That means you can write:

```haskell
[ x^2 | x <- [1..] ]   -- an infinite list, perfectly fine
```

Laziness is the seed of **streams**: a collection you consume incrementally rather than all at once. RxJS Observables are lazy in exactly this sense - nothing happens until you subscribe.

---

## Step 2: Microsoft LINQ (query any source)

In 2007, **Erik Meijer** and the C# team shipped **LINQ** (Language Integrated Query). It brought comprehension-style querying into a mainstream imperative language:

```csharp
// Query syntax
from x in numbers where x > 3 select x * x

// Fluent / method syntax
numbers.Where(x => x > 3).Select(x => x * x)
```

The **key leap**: these operators (`Where`, `Select`, `GroupBy`, `OrderBy`, …) are defined over the *interface* `IEnumerable<T>`, not over any specific collection. The same query runs over an in-memory array, a database table, or an XML document. The operators became **domain-agnostic** - a theme that becomes the thesis of Module 2.

---

## Step 3: Rx.NET and the duality insight (push)

Around 2009, Erik Meijer and the Reactive Extensions team at Microsoft asked a now-famous question: what is the *mathematical dual* of an iterable?

An `IEnumerable<T>` is **pull-based**: the consumer calls `MoveNext()` and *pulls* the next value when it is ready. Flip the direction of control and you get `IObservable<T>`: the producer *pushes* values at the consumer when *they* are ready.

> **Erik Meijer's key insight:** *"An Observable is just an Iterable flipped upside down."* The iterator **pulls**; the observable **pushes**. Everything else is the same.

This duality means every operator you know from LINQ has a counterpart over Observables, because the algebra is identical - only the direction of data flow changed.

| Axis         | Pull (`IEnumerable<T>`)        | Push (`IObservable<T>`)        |
|--------------|--------------------------------|--------------------------------|
| Who drives   | Consumer pulls                 | Producer pushes                |
| Single value | `T` (`getValue()`)             | `Task<T>` / `Promise<T>`       |
| Many values  | `IEnumerable<T>` (iterator)    | `IObservable<T>` (observable)  |
| Synchronous  | `T`, `IEnumerable<T>`          | -                              |
| Asynchronous | -                              | `Promise<T>`, `Observable<T>`  |

The bottom-right quadrant - **asynchronous, many values** - is the quadrant that had no good primitive before. Observables fill it.

---

## Step 4: RxJS (push in JavaScript)

The ideas crossed into JavaScript at **Netflix** around 2012, with **Matthew Podwysocki** doing early porting work. **Ben Lesh** later led the **RxJS 5** rewrite (a ground-up reimplementation focused on performance and spec alignment), and **RxJS 6** introduced the **pipe API** that replaced prototype-patched operators with tree-shakeable, composable functions:

```js
// RxJS 6+ pipe API
source$.pipe(
  filter(x => x > 3),
  map(x => x * x)
);
```

That pipeline is `{ x² | x ∈ source, x > 3 }` written in JavaScript. The circle closes: a 2,000-year-old piece of mathematical notation, now pushing values over a WebSocket.

---

## Deeper roots

The lineage above is the main trunk, but several older ideas feed into it.

### Observer and Iterator patterns (GoF, 1994)
The *Design Patterns* book formalized two patterns RxJS fuses:
- **Iterator** - sequential access to elements of a collection (the pull side).
- **Observer** - a subject notifies dependents of changes (the push side).

An Observable is literally these two patterns combined: an *iterable sequence* that *notifies* you of each element.

### Functional Reactive Programming (Conal Elliott & Paul Hudak, 1997)
Their paper *"Functional Reactive Animation"* (Fran) introduced **FRP** with two concepts:
- **Behaviors** - values that vary over *continuous* time (e.g. a mouse position as a function of `t`).
- **Events** - discrete occurrences.

RxJS is often called "FRP," but it is more precisely **discrete** event streams, not Elliott's **continuous**-time behaviors. The resemblance is real; the semantics differ. (Elliott has publicly noted that most "FRP" libraries, RxJS included, are not FRP in his original continuous-time sense.)

### Functional programming (back to LISP, 1958)
`map`, `filter`, and `reduce` are not Rx inventions - they are the staple higher-order functions of functional programming, traceable to **LISP (1958)**. RxJS simply lifts them from lists into streams.

---

## Lineage at a glance

```
   1958        1994          1997            2007        2009        2012+
  ┌──────┐  ┌─────────┐  ┌──────────┐    ┌──────┐    ┌───────┐   ┌───────┐
  │ LISP │  │ GoF:    │  │ FRP      │    │ LINQ │    │ Rx.NET│   │ RxJS  │
  │ map  │  │ Observer│  │ Elliott/ │    │Meijer│    │Meijer │   │Netflix│
  │filter│  │ Iterator│  │ Hudak    │    │      │    │ dual  │   │ Lesh  │
  └──┬───┘  └────┬────┘  └────┬─────┘    └──┬───┘    └───┬───┘   └───┬───┘
     │           │            │             │            │           │
     │  higher-  │  push +    │ time as a   │  query     │  pull →   │  push
     │  order fns│  pull      │ first-class │  any source│  push dual│  in JS
     └───────────┴────────────┴─────────────┴────────────┴───────────┘
                                   ▼
         Mathematics: set builder notation  { x² | x ∈ ℕ, x > 3 }
```

---

## Key takeaway

RxJS is the push-based, JavaScript-hosted descendant of a single idea - *declaratively describe a transformed collection* - that runs from set builder notation through Haskell, LINQ, and Rx.NET. The pivotal move was Erik Meijer's **duality insight**: an Observable is an Iterable with the arrows reversed. Because the algebra is preserved under that flip, almost everything you know about collections transfers directly to streams.
