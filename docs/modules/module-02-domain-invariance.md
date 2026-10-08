# Module 2 - Operators as Domain-Invariant Algebra

> **Prerequisites:** [Module 1 - Origins & Lineage](./module-01-lineage.md). You should know that RxJS inherited domain-agnostic operators from LINQ.
>
> **What you'll learn:** The central thesis of the whole course - the *domain* of a stream changes constantly, but the *operators* stay the same - and the formal reason this works (Functors).

Here is the single most important idea in reactive programming:

> **The domain changes. The operators do not.**

Mouse clicks, GPS coordinates, HTTP responses, WebSocket frames, animation frames, stock prices, sensor readings - these are wildly different sources of data. Yet the handful of operators you learn (`map`, `filter`, `switchMap`, `scan`, `debounceTime`, …) apply to *all* of them, unchanged. Once you internalize this, you stop learning "the RxJS way to do HTTP" or "the RxJS way to do drag-and-drop." There is only *the RxJS way*, and the domain is a detail you plug in at the edges.

---

## The same pipeline, four domains

Watch the same *shapes* of operator pipelines solve problems in four unrelated domains.

### Drag and drop (DOM events)
```js
const drag$ = mousedown$.pipe(
  switchMap(() =>
    mousemove$.pipe(takeUntil(mouseup$))
  )
);
```
"On each mouse-down, switch to the stream of mouse-moves until mouse-up." Pure event choreography.

### GPS tracking (geolocation)
```js
const movement$ = gps$.pipe(
  distinctUntilChanged((a, b) => a.lat === b.lat && a.lng === b.lng),
  map(pos => ({ lat: pos.lat, lng: pos.lng }))
);
```
"Ignore readings that did not change, then project to a simple shape."

### Stock prices (financial feed)
```js
const avgAbove$ = prices$.pipe(
  filter(p => p.symbol === 'ACME'),
  map(p => p.price),
  scan((acc, price) => (acc * 0.9) + (price * 0.1), 0), // running smoothed avg
  distinctUntilChanged()
);
```
"Keep one symbol, extract the price, maintain a running average, drop duplicates."

### HTTP type-ahead search (network)
```js
const results$ = searchInput$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(term => http.get(`/search?q=${term}`))
);
```
"Wait for typing to settle, ignore repeats, cancel the in-flight request and start a new one."

**Look at the overlap.** `switchMap` appears in drag-and-drop *and* HTTP search. `distinctUntilChanged` appears in GPS, stocks, *and* search. `map` is everywhere. The operators do not know or care what the values mean.

---

## The formal reason: Functors

Why does this work? Because `map` (and its relatives) is a **Functor** operation: a structure-preserving mapping that works for *any* container, defined once over the container's shape rather than its contents.

```js
[1, 2, 3].map(f);              // Array  - a container of values "in space"
promise.then(f);               // Promise - a container of one future value
source$.pipe(map(f));          // Observable - a container of values "in time"
```

All three are the **same operation** (apply `f` inside the container, get back a new container of the same shape) over **different containers**. The Functor laws (identity and composition, formalized in Module 3) hold for every one of them. That is precisely why the operator does not need to know the domain: it operates on the *container*, and the domain lives *inside* the container.

---

## The invariant operators across the lineage

The same operators appear at every level of the lineage from Module 1, only the domain of the elements changes:

| Lineage level | Container / source     | `transform` | `filter`  | `combine` | Example domain              |
|---------------|------------------------|-------------|-----------|-----------|-----------------------------|
| Set theory    | sets                   | `x²`        | `x > 3`   | `∪`, `∩`  | numbers                     |
| Haskell       | lazy lists             | `map`       | `filter`  | `++`, zip | finite/infinite sequences   |
| LINQ          | `IEnumerable<T>`       | `Select`    | `Where`   | `Concat`, `Zip` | arrays, DB rows, XML  |
| Rx.NET        | `IObservable<T>`       | `Select`    | `Where`   | `Merge`, `Zip` | async events (.NET)    |
| RxJS          | `Observable<T>`        | `map`       | `filter`  | `merge`, `zip` | clicks, HTTP, sockets… |

Reading across a row shows the *same algebra*; reading down a column shows the *same operator* surviving a change of host language and runtime.

---

## The practical power

Domain invariance is not an academic nicety - it buys you concrete engineering leverage.

### 1. Swap domains without rewriting logic
The processing pipeline is independent of the source. Prototype against a hard-coded source, then point the same pipeline at a live one:

```js
// Development
const source$ = of(1, 2, 3, 4, 5);

// Production
const source$ = webSocket('wss://feed.example.com');

// The pipeline below is byte-for-byte identical in both cases:
source$.pipe(filter(x => x > 3), map(x => x * x), scan((a, b) => a + b, 0));
```

### 2. Combine across domains
Because every source is an `Observable<T>`, sources from *different* domains compose with the same combination operators:

```js
combineLatest([gps$, http$, websocket$]).pipe(
  map(([location, config, liveUpdate]) => mergeIntoView(location, config, liveUpdate))
);
```
A GPS reading, an HTTP config response, and a WebSocket push are joined as if they were three numbers. The algebra does not notice they came from three different worlds.

### 3. Test with `of`, deploy with `webSocket`
Testing is trivial because you can substitute a synchronous, deterministic source (`of(1, 2, 3)`) for an asynchronous production source (`webSocket(...)`) without touching the logic under test.

---

## The analogy to lock in

> **Algebra is independent of what the numbers represent.** `(a + b) × c` is true whether `a` is apples, dollars, or electrons.
>
> **RxJS operators are independent of what the streams represent.** `source$.pipe(filter(p), map(f))` behaves identically whether the stream carries clicks, prices, or sensor readings.

The operators *are* the algebra. The domain is just the interpretation you assign to the symbols.

---

## Key takeaway

You do not learn "RxJS for HTTP" and then "RxJS for events" - you learn *the operators once* and apply them to every domain, because operators are **Functors** (and, as later modules show, Monads and Monoids) defined over the *container*, not the contents. The domain is a plug-in at the edges; the algebra in the middle never changes.
