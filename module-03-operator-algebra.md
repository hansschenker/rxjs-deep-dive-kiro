# Module 3 - The Operator Algebra

> **Prerequisites:** [Module 1](./module-01-lineage.md) and [Module 2](./module-02-domain-invariance.md). You should accept the thesis that operators are domain-invariant.
>
> **What you'll learn:** How to see RxJS as a genuine *algebra* - a set of values, a set of operations, and a set of laws - and how each major operator family fits that frame.

This is the longest module and the structural heart of the course. We go operator by operator, always asking the same three algebraic questions: *What are the values? What are the operations? What laws do they obey?*

---

## Step 1: What is an algebra?

An **algebra** is three things:

1. **Values** - a set of objects.
2. **Operations** - functions that take values and produce values.
3. **Laws** - equations that always hold, letting you reason and refactor safely.

Integer algebra, for example:

| Component  | Integer algebra                       |
|------------|---------------------------------------|
| Values     | …, −2, −1, 0, 1, 2, …                  |
| Operations | `+`, `−`, `×`                          |
| Laws       | `a + 0 = a`, `a × 1 = a`, `(a+b)+c = a+(b+c)` … |

The RxJS algebra is the exact same idea:

| Component  | RxJS algebra                                      |
|------------|---------------------------------------------------|
| Values     | **Observables** `Observable<T>`                   |
| Operations | **Operators** (`map`, `filter`, `merge`, …)       |
| Laws       | identity, composition, associativity, …           |

The payoff of knowing the laws is the same as in arithmetic: you can rewrite expressions into equivalent, simpler, or faster forms with confidence.

---

## Step 2: The Observable primitive (the values)

An Observable communicates over **three channels**:

| Channel      | Meaning                               | Cardinality        |
|--------------|---------------------------------------|--------------------|
| `next(v)`    | here is a value                       | 0 or more          |
| `error(e)`   | something failed; terminal            | at most once       |
| `complete()` | no more values; terminal              | at most once       |

The **grammar** is strict: zero or more `next`, then *at most one* of `error` or `complete`. In marble notation:

```
Normal:    --a--b--c|          ('|' = complete)
Error:     --a--b--#           ('#' = error)
Infinite:  --a--b--c--d--…      (no terminator)
```

Everything downstream in the algebra respects this grammar.

---

## Step 3: `map` - the foundational Functor

```
map : (A → B) → Observable<A> → Observable<B>
```

`map(f)` applies `f` to every `next` value and leaves the structure untouched. **Structure-preserving** means:
- **timing** is preserved (a value emitted at frame 20 still emerges at frame 20),
- **order** is preserved,
- **completion/error** pass through unchanged.

```
source:   --1--2--3|
map(x*10) --10-20-30|
```

Because it preserves structure, `map` satisfies the two **Functor laws**:

```
Identity:     map(x => x)          ≡  source
Composition:  map(f) then map(g)   ≡  map(x => g(f(x)))
```

The composition law is a license to **fuse** adjacent maps, which RxJS can and does exploit for performance.

---

## Step 4: `filter` - membership

```
filter : (A → Boolean) → Observable<A> → Observable<A>
```

`filter(p)` lets through only values where `p` is true. It is the stream version of set *membership* / comprehension's guard clause.

```
source:        --1--2--3--4|
filter(x>2)    -------3--4|
```

Its laws:

```
Identity:      filter(() => true)   ≡  source
Annihilation:  filter(() => false)  ≡  EMPTY        (completes with no values)
Composition:   filter(p) then filter(q)  ≡  filter(x => p(x) && q(x))
```

The composition law says a chain of filters fuses into one predicate conjunction.

---

## Step 5: `pipe()` - the composition operator

`pipe()` is not just syntax; it is the algebra's **composition operator**. Operators are functions `Observable → Observable`, and `pipe` composes them:

```js
source$.pipe(op1, op2, op3);
// is exactly
op3(op2(op1(source$)));
// which is function composition
(op3 ∘ op2 ∘ op1)(source$);
```

Two algebraic facts follow:

- **Closure under composition.** Each operator maps an Observable to an Observable, so any composition of operators is *again* an operator `Observable → Observable`. The set of operators is closed under `pipe`.
- **Reusable operators.** Because a composition is itself an operator, you can name it and reuse it:

```js
const smoothedAbove = (threshold) => pipe(
  filter(x => x > threshold),
  map(x => x * x)
);

source$.pipe(smoothedAbove(3));   // drop it straight into any pipeline
```

---

## Step 6: The four flattening operators (Monad bind)

When each value maps to *another* Observable (`A → Observable<B>`), you must decide how to **flatten** the resulting Observable-of-Observables. There are four canonical strategies.

```
outer:     --a--------b--------c|
inner(x):    x1-x2-x3|   (each inner emits 3 then completes)
```

### `mergeMap` - union, concurrent
Subscribe to every inner immediately; interleave their outputs. (Set-theoretic *union*.)
```
--a1-a2-a3-b1-b2-b3-c1-c2-c3|   (overlapping if timings overlap)
```

### `concatMap` - sequential, ordered
Queue inners; run the next only after the previous completes. Order guaranteed.
```
--a1-a2-a3--b1-b2-b3--c1-c2-c3|
```

### `switchMap` - latest wins, cancels previous
On a new outer value, **unsubscribe** the current inner and switch to the new one.
```
--a1-a2--(a3 cancelled)--b1-b2--(b3 cancelled)--c1-c2-c3|
```

### `exhaustMap` - first wins, ignores new while busy
While an inner is running, **drop** new outer values.
```
--a1-a2-a3--(b ignored)--(c ignored)|   (if b,c arrive during a's inner)
```

### Decision matrix

| Operator     | Order preserved? | Cancel previous? | Ignore while busy? | Run concurrently? | Typical use |
|--------------|:----------------:|:----------------:|:------------------:|:-----------------:|-------------|
| `mergeMap`   | no               | no               | no                 | **yes**           | parallel independent work |
| `concatMap`  | **yes**          | no               | no                 | no (one at a time)| ordered writes / queue |
| `switchMap`  | n/a (latest)     | **yes**          | no                 | no                | type-ahead, "latest matters" |
| `exhaustMap` | n/a (first)      | no               | **yes**            | no                | debounce double-submit (login button) |

These four differ in *one* dimension - their transition rule on a new outer value - a point Module 5 formalizes.

---

## Step 7: Combination operators (set operations)

Operators that merge *multiple* Observables are the stream analogues of set operations.

| Operator        | Behavior                                                   | Set framing            |
|-----------------|-----------------------------------------------------------|------------------------|
| `merge`         | interleave all sources in time order                      | **A ∪ B** (union)      |
| `concat`        | drain source A fully, then B, then C                      | ordered union          |
| `zip`           | pair by **index**: nth of A with nth of B                 | strict index pairing   |
| `combineLatest` | on any emission, combine the **latest** of each           | **A × B** (product of latests) |
| `race`          | subscribe to all, keep the **first to emit**, drop rest   | choice                 |

```
A: --1----2----3|
B: ----a----b----c|

merge:         --1--a-2--b-3--c|        (union, time-ordered)
zip:           ----1a---2b---3c|        (index pairs: 1&a, 2&b, 3&c)
combineLatest: ----1a-2a-2b-3b-3c|      (latest-of-each on every tick)
concat:        --1----2----3|a--b--c|   (A then B - only if A completes)
```

Set-operation framing: `merge` is **union** (A ∪ B); `zip` and `combineLatest` are flavors of **intersection / cartesian product** (A ∩ B / A × B - pairing values from both sides).

---

## Step 8: The full set-operator mapping

The algebra is self-consistent: nearly every operator corresponds to a set-theoretic or relational operation.

| RxJS operator            | Set / relational operation      |
|--------------------------|---------------------------------|
| `map`                    | transform (image of a function) |
| `filter`                 | membership / selection          |
| `merge`, `concat`        | union (∪)                       |
| `zip`, `combineLatest`   | intersection / product (∩, ×)   |
| `takeUntil`              | difference (A until B occurs)   |
| `withLatestFrom`         | cartesian product (gated)       |
| `distinct`               | set uniqueness                  |
| `take`, `skip`           | subset / slice                  |
| `reduce`, `scan`         | aggregation / fold              |
| `count`                  | cardinality (\|A\|)             |

---

## Step 9: `scan` vs `reduce` - fold over time

Both fold a stream with an accumulator, but they differ in *when* they emit:

```
source:                 --1--2--3|
scan((a,b)=>a+b, 0):    --1--3--6|      (emits every running total)
reduce((a,b)=>a+b, 0):  ---------6|     (emits once, on complete)
```

- **`scan`** emits *every intermediate* value - a running total. It works on infinite streams.
- **`reduce`** emits *only the final* value - and therefore only on `complete`, so it never emits on an infinite stream.

`scan` is the foundation of **state management** in RxJS. A reducer over an action stream is just a `scan`:

```js
const state$ = actions$.pipe(
  scan((state, action) => reducer(state, action), initialState)
);
```

That single line is the kernel of Redux-style stores, expressed as pure algebra.

---

## Step 10: The full algebra, by category

| Category     | Operators (examples)                     | Algebraic structure           |
|--------------|------------------------------------------|-------------------------------|
| Transform    | `map`, `mapTo`, `pluck`                   | **Functor**                   |
| Flatten      | `mergeMap`, `concatMap`, `switchMap`, `exhaustMap` | **Monad** (bind / `>>=`) |
| Filter       | `filter`, `take`, `skip`, `distinct`      | selection / membership        |
| Combine      | `merge`, `zip`, `combineLatest`, `concat` | **Set operations**            |
| Time         | `delay`, `debounceTime`, `throttleTime`   | **Temporal algebra** (Module 4) |
| Accumulate   | `scan`, `reduce`                          | **Monoid** fold               |
| Multicast    | `share`, `shareReplay`, `multicast`       | Subject + lifecycle (Module 8) |

---

## Step 11: Key laws to remember

```
Associativity of concat:   concat(a, concat(b, c))   ≡  concat(concat(a, b), c)
Identity of merge:         merge(source, EMPTY)       ≡  source
Functor identity:          map(x => x)                ≡  source
Functor composition:       map(f) then map(g)         ≡  map(x => g(f(x)))
Filter fusion:             filter(p) then filter(q)   ≡  filter(x => p(x) && q(x))
switchMap collapse:        switchMap(x => of(x))      ≡  map(x => x)    ≡  source
map/filter commutativity:  map(f) then filter(p)  ≈  filter(x => p(f(x))) then map(f)
                           (holds only when f is injective / p is adjusted accordingly - use care)
```

> ⚠️ Verify these equivalences against the current rxjs.dev docs and your RxJS version before relying on them in teaching material; subtle edge cases (empty streams, error propagation, scheduler effects) can break naive rewrites.

---

## Key takeaway

RxJS is a real algebra: **Observables** are the values, **operators** are the operations, and a compact set of **laws** governs composition. `map` is the Functor, the flattening operators are Monad bind, the combination operators are set operations, and `scan` is a fold. Once you see the laws, operators stop being a list to memorize and become expressions you can rewrite and reason about like arithmetic.
