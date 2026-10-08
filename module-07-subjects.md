# Module 7 - Subjects: the Fork in the Dataflow

> **Prerequisites:** [Module 3 - The Operator Algebra](./module-03-operator-algebra.md) and [Module 5 - Operators as Mealy Machines](./module-05-mealy-machines.md) (the lifecycle state machine at the end reuses that lens).
>
> **What you'll learn:** What a Subject is (an Observer *and* an Observable at once), why it is the hinge where one producer fans out to many consumers, the four Subject variants and how much past they remember, and the lifecycle rules and pitfalls that bite people.

So far every stream has been **unicast**: each subscriber gets its own private execution. Subjects break that assumption. They are the mechanism by which one source feeds *many* consumers - the fork in the dataflow.

---

## Step 1: A Subject is both ports at once

```
Subject = Observer + Observable
```

| Port         | Interface                          | Role          |
|--------------|------------------------------------|---------------|
| **input**    | `next(v)`, `error(e)`, `complete()`| Observer side |
| **output**   | `subscribe(observer)`              | Observable side |

Because it implements both interfaces, a Subject is a **proxy / hinge** where a push *producer* (calling `next`) meets *many* consumers (who `subscribe`). You push into one end; it fans out of the other.

```
             push in                     fan out
   producer ───────▶ ┌─────────┐ ───────▶ observer A
                     │ SUBJECT │ ───────▶ observer B
                     └─────────┘ ───────▶ observer C
```

---

## Step 2: Why it is a proxy

Internally a Subject keeps a registry of current observers and relays each `next` to all of them:

```ts
class SimpleSubject {
  private observers = [];

  subscribe(observer) {
    this.observers.push(observer);
    return { unsubscribe: () => {
      this.observers = this.observers.filter(o => o !== observer);
    }};
  }

  next(value)    { this.observers.forEach(o => o.next(value)); }   // fan-out
  error(err)     { this.observers.forEach(o => o.error(err)); }
  complete()     { this.observers.forEach(o => o.complete()); }
}
```

One `next()` call → every current subscriber receives the **same** value. That shared `observers[]` list is the whole trick.

---

## Step 3: Unicast vs multicast

### Unicast - a cold Observable
A cold Observable re-runs its producer *for each subscriber*. Values are private per subscription.

```js
const cold$ = new Observable(sub => {
  const r = Math.random();   // runs once PER subscriber
  sub.next(r);
});

cold$.subscribe(v => console.log('A', v)); // A 0.1234…
cold$.subscribe(v => console.log('B', v)); // B 0.9876…  ← different value!
```

```
A: ──r₁|
B: ──────r₂|      (independent executions)
```

### Multicast - a Subject
A Subject is **hot**: one `next()` reaches all current subscribers with the *same* value.

```js
const subject = new Subject();
subject.subscribe(v => console.log('A', v));
subject.subscribe(v => console.log('B', v));
subject.next(42);   // A 42   B 42   ← same value to both
```

```
       next(42)
subject ───────┬──────▶ A: 42
               └──────▶ B: 42
```

---

## Step 4: The "fork in the dataflow"

The headline use: take **one** upstream execution and fork it to **N** independent downstream pipelines.

```
                         ┌─ map ───────▶ pipeline A
one source execution ──▶ SUBJECT ──┼─ filter ────▶ pipeline B
                         └─ scan ──────▶ pipeline C
```

```js
const subject = new Subject();

subject.pipe(map(x => x * 2)).subscribe(/* A */);
subject.pipe(filter(x => x > 5)).subscribe(/* B */);
subject.pipe(scan((a, b) => a + b, 0)).subscribe(/* C */);

source$.subscribe(subject);   // ONE execution feeds all three
```

Without the Subject, subscribing three pipelines to a cold `http.get(...)` source fires **three HTTP calls**. With the Subject, the source runs **once** and the single result forks to all three. It is a **tee / wye junction** in the pipe.

---

## Step 5: Bridging imperative callbacks into reactive pipelines

A Subject is the standard **adapter** between the callback world and the Observable world. Push into `next()` from imperative callbacks; `subscribe` on the reactive side.

```js
const clicks$ = new Subject();
button.addEventListener('click', e => clicks$.next(e));     // imperative → next()

const messages$ = new Subject();
websocket.onmessage = msg => messages$.next(JSON.parse(msg.data));

// Reactive side consumes them like any Observable:
clicks$.pipe(debounceTime(200)).subscribe(handleClick);
messages$.pipe(filter(m => m.type === 'tick')).subscribe(render);
```

The Subject is the bridge: callbacks feed its Observer port, pipelines read its Observable port.

---

## Step 6: The four variants - how much past they remember

The variants differ only in **how much past state the proxy replays to new subscribers**.

| Variant                      | Remembers         | New subscriber gets           | Ideal for   |
|------------------------------|-------------------|-------------------------------|-------------|
| `Subject`                    | nothing           | only **future** emissions     | events      |
| `BehaviorSubject(seed)`      | last **1** value  | the **current** value, then future | **state**   |
| `ReplaySubject(n[, windowMs])`| last **n** values| the last `n`, then future     | history/cache |
| `AsyncSubject`               | final **1** value | the **last** value, on `complete` only | result (Promise-like) |

### `Subject` - future only
```js
const s = new Subject();
s.next(1);                       // nobody is listening → lost
s.subscribe(v => console.log(v));// subscriber sees nothing yet
s.next(2);                       // logs 2
```
```
s:  1   2   3
A:      └sub┘ ▶ 2 3    (missed 1)
```

### `BehaviorSubject` - current value, has `.value`
```js
const s = new BehaviorSubject(0);
console.log(s.value);            // 0  (synchronous read!)
s.next(1);
s.subscribe(v => console.log(v));// logs 1 immediately (the current value)
s.next(2);                       // logs 2
```
```
s:  (0) 1   2
A:        └sub▶ 1  2   (gets current 1 on subscribe)
```
Perfect for **state**: there is always a "current" value and you can read it synchronously via `.value`.

### `ReplaySubject(n)` - last n (history / cache)
```js
const s = new ReplaySubject(2);
s.next(1); s.next(2); s.next(3);
s.subscribe(v => console.log(v));// logs 2, 3 (the last 2), then future
```
```
s:  1 2 3
A:      └sub▶ 2 3 …    (replays last 2)
```
Optional `windowMs` expires buffered values by age. Ideal for **history** or a bounded **cache**.

### `AsyncSubject` - final value on complete (result)
```js
const s = new AsyncSubject();
s.next(1); s.next(2); s.next(3);
s.subscribe(v => console.log(v));// nothing yet
s.complete();                    // NOW logs 3 (only the last value, delivered on complete)
```
```
s:  1 2 3 |complete
A:  ────────▶ 3        (only final value, only on complete)
```
Promise-like: one result, delivered when the work finishes.

---

## Step 7: Subjects power the multicasting operators

The multicasting operators from Module 8 are *built on* these variants:

```
share()        ─▶ backed by a Subject
shareReplay(n) ─▶ backed by a ReplaySubject(n)
```

The choice of backing Subject is the choice of multicast behavior - the whole subject of the next module.

---

## Step 8: Lifecycle - `error` and `complete` are terminal

`error` and `complete` are **one-way doors**. Once a Subject receives either, it is **stopped**:

- future subscribers immediately receive the terminal signal (`complete`, or the stored `error`),
- any subsequent `next()` is **ignored** (no fan-out).

As a state machine (reusing Module 5's lens):

```
         next / fan-out
        ┌──────────────┐
        ▼              │
     (active) ─────────┘
       │  │
 error │  │ complete
       ▼  ▼
   (errored)  (completed)       ← trap / terminal states
   future subscribers get the terminal signal immediately;
   next() is a no-op from here on.
```

```js
const s = new Subject();
s.subscribe({ complete: () => console.log('A done') });
s.complete();                    // A done
s.next(99);                      // ignored - Subject is stopped
s.subscribe({ complete: () => console.log('B done') }); // B done (immediately)
```

---

## Step 9: Pitfalls

| Pitfall                          | Symptom                                      | Fix |
|----------------------------------|----------------------------------------------|-----|
| **Missed emissions**             | late subscriber sees nothing                 | use `BehaviorSubject` / `ReplaySubject` |
| **Dead Subject after error**     | nothing works after one failure              | isolate error handling; don't let it hit the shared Subject, or recreate |
| **Memory leaks**                 | subscriptions never released                 | `takeUntil(destroy$)` or the `async` pipe |
| **`shareReplay` without refCount** | source stays live forever                  | configure refCount / resetOnRefCountZero (⚠️ verify defaults - Module 8) |
| **Exposing the Subject publicly**| consumers can call `next()` on your state    | expose via `asObservable()` |

### Encapsulation with `asObservable()`

Never hand out the Observer port. Keep the Subject private; expose only the Observable side:

```ts
class CounterStore {
  private readonly _state = new BehaviorSubject(0);
  readonly state$ = this._state.asObservable();   // read-only to the outside

  increment() { this._state.next(this._state.value + 1); } // mutation only via methods
}
```

Consumers can `subscribe` to `state$` but cannot `next()` into it, so all state changes funnel through `increment()`.

---

## Key takeaway

A **Subject** is simultaneously an **Observer and an Observable** - the hot, multicast hinge where one producer forks to many consumers (one upstream execution, N downstream pipelines, instead of N re-runs). It bridges imperative callbacks into reactive pipelines, and its four variants differ only in **how much past they replay**: `Subject` (nothing), `BehaviorSubject` (current, for state), `ReplaySubject(n)` (history/cache), `AsyncSubject` (final result). `error`/`complete` are **terminal one-way doors**, and you should always expose Subjects as read-only via `asObservable()`.
