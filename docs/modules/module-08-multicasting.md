# Module 8 - Multicasting = Subject + Lifecycle

> **Prerequisites:** [Module 7 - Subjects: the Fork in the Dataflow](./module-07-subjects.md). You must know the four Subject variants and what each replays.
>
> **What you'll learn:** The law that *every* multicast operator is backed by a Subject, how the connectable/multicast primitive works, the full operator↔Subject mapping, and how the lifecycle layer (connect, ref-count, reset) sits on top of the Subject to produce operators like `share` and `shareReplay`.

Module 7 built the Subject. This final module shows that the entire multicasting toolbox is nothing but **a Subject plus a lifecycle policy**. Learn the law once and every multicast operator becomes predictable.

---

## Step 1: The law

> **Every multicast operator is backed by a Subject. There is no multicasting without a Subject.**
>
> **The choice of Subject determines the behavior.**

That is the whole module in two sentences. Everything else is detail.

---

## Step 2: The core mechanism - connect the Subject to the source once

Multicasting works by inserting a Subject between the source and the subscribers:

1. The Subject **subscribes to the source** - *once*.
2. Each consumer **subscribes to the Subject**, not to the source.

So the source runs a single time, and the Subject fans its values out (exactly Module 7's fork).

### Manual version (the mechanism laid bare)
```js
const subject = new Subject();

subject.subscribe(observerA);   // consumers attach to the SUBJECT
subject.subscribe(observerB);

source$.subscribe(subject);     // the SUBJECT attaches to the source - ONCE
```

### Modern `connectable` version
```js
import { connectable, Subject } from 'rxjs';

const shared$ = connectable(source$, {
  connector: () => new Subject()   // ← the connector factory
});

shared$.subscribe(observerA);
shared$.subscribe(observerB);
shared$.connect();                 // NOW the Subject subscribes to the source
```

The **connector factory** - `() => new Subject()` - *is the proof* of the law. Whatever Subject that factory returns is literally the thing doing the multicasting. Swap the factory, swap the behavior.

---

## Step 3: Master table - operator ↔ connector Subject

| Operator                 | Connector Subject        | Late subscriber sees…                 |
|--------------------------|--------------------------|---------------------------------------|
| `share()`                | `Subject`                | only future emissions                 |
| `shareReplay(n)`         | `ReplaySubject(n)`       | last `n`, then future                 |
| `publish()`              | `Subject`                | only future (manual `connect`)        |
| `publishBehavior(x)`     | `BehaviorSubject(x)`     | current value, then future            |
| `publishReplay(n)`       | `ReplaySubject(n)`       | last `n`, then future                 |
| `publishLast()`          | `AsyncSubject`           | final value, on complete              |
| `multicast(subjectFactory)` | whatever you pass     | depends on the Subject                |
| `connectable(src, {connector})` | whatever you pass  | depends on the connector              |

Read the middle column top to bottom: it is *just* the four Subject variants from Module 7. The operators are thin wrappers choosing a connector.

---

## Step 4: The legacy `publish*` family is `multicast` made explicit

The old `publish*` operators are literally `multicast` with a fixed Subject factory:

```js
publish()           ≡  multicast(() => new Subject())
publishBehavior(x)  ≡  multicast(() => new BehaviorSubject(x))
publishReplay(n)    ≡  multicast(() => new ReplaySubject(n))
publishLast()       ≡  multicast(() => new AsyncSubject())
```

> ⚠️ The `publish*` and `multicast` operators are **deprecated** in modern RxJS in favor of `share`, `shareReplay`, and `connectable`. Verify the exact deprecation status and equivalences against rxjs.dev for your version before teaching.

---

## Step 5: Behavior follows the Subject (demonstration)

Hold **everything** constant - same source `of(1, 2, 3)`, same lifecycle, same late-subscriber timing - and swap **only the connector**. Four connectors → four behaviors:

| Connector swapped in     | What the late subscriber receives |
|--------------------------|-----------------------------------|
| `new Subject()`          | nothing (missed 1, 2, 3)          |
| `new BehaviorSubject(0)` | the current/last value            |
| `new ReplaySubject(3)`   | `1, 2, 3` replayed                |
| `new AsyncSubject()`     | `3` (the final value, on complete)|

```js
const base = (connector) => connectable(of(1, 2, 3), { connector });

// Only this one argument changes; the behavior changes with it.
base(() => new Subject());         // → late subscriber: (nothing)
base(() => new BehaviorSubject(0));// → late subscriber: current value
base(() => new ReplaySubject(3));  // → late subscriber: 1,2,3
base(() => new AsyncSubject());    // → late subscriber: 3
```

This is the law made visible: **behavior follows the Subject**.

---

## Step 6: The lifecycle layer - what operators add on top

A bare Subject multicasts, but it does not know *when* to connect to the source, *when* to tear down, or *whether* to restart. That orchestration is the **lifecycle layer** operators add:

- **Connecting** - subscribe the Subject to the source (manual `connect()`, or automatic).
- **Ref-counting** - track active subscribers: `0 → 1` triggers connect; `→ 0` triggers disconnect.
- **Resetting** - on error / complete / ref-count-zero, decide whether to tear down and allow a fresh start.

### Ref-count timeline
```
subscribers:   0        1        2        1        0
                        │                          │
                        ▼                          ▼
               ─────[CONNECT]──────────────────[DISCONNECT]─────
               (source starts)                 (source stops)
```

### `share()` configuration (RxJS 7+)
```js
share({
  connector: () => new Subject(),  // which Subject backs it
  resetOnError: true,              // ⚠️ verify default
  resetOnComplete: true,           // ⚠️ verify default
  resetOnRefCountZero: true,       // ⚠️ verify default
});
```

> ⚠️ **Verify the exact default values** of `resetOnError`, `resetOnComplete`, and `resetOnRefCountZero` against rxjs.dev for your RxJS version. These defaults changed across major versions and are a common source of subtle bugs; do not teach specific defaults from memory.

---

## Step 7: `shareReplay` dissected

```
shareReplay(n)  =  share  +  ReplaySubject(n)
```

It is the **caching workhorse**. The replay buffer of the backing `ReplaySubject` *is* the cache:

```js
const config$ = http.get('/config').pipe(
  shareReplay(1)   // the single HTTP call's result is cached in the ReplaySubject(1) buffer
);

config$.subscribe(renderHeader);  // triggers the one HTTP call
config$.subscribe(renderFooter);  // gets the cached value - no second call
```

Late subscribers read straight from the ReplaySubject buffer; the source never runs again (subject to the reset policy - ⚠️ verify refCount/reset defaults).

---

## Step 8: Decision tree - pick by "what should late subscribers see?"

```
What should a late subscriber receive?
│
├─ nothing (future only) ─────────────▶ Subject         → share() / publish()
│
├─ the current value ─────────────────▶ BehaviorSubject → publishBehavior(seed)
│
├─ the last N values ─────────────────▶ ReplaySubject(n)→ shareReplay(n) / publishReplay(n)
│
└─ the final value, on complete ──────▶ AsyncSubject    → publishLast()
```

Choosing a multicast operator is *the same decision* as choosing a Subject variant in Module 7 - because they are the same decision.

---

## Step 9: The full picture

```
   MULTICAST OPERATOR
   ┌───────────────────────────────────────────────┐
   │                                                 │
   │   ┌─────────────────┐     ┌───────────────────┐ │
   │   │   SUBJECT        │     │  LIFECYCLE POLICY │ │
   │   │ (behavior:       │  +  │  when to connect  │ │
   │   │  which values    │     │  ref-counting     │ │
   │   │  late subs see)  │     │  when to reset    │ │
   │   └─────────────────┘     └───────────────────┘ │
   │                                                 │
   └───────────────────────────────────────────────┘
        the Subject multicasts;
        the operator merely ORCHESTRATES it.
```

**The operator never multicasts itself.** It picks a Subject (the behavior) and wraps it in a lifecycle policy (when to connect and reset). The Subject does the actual fan-out.

---

## Key takeaway

Multicasting = **a Subject (behavior) + a lifecycle policy (when to connect / reset)**. The law - *every multicast operator is backed by a Subject, and the choice of Subject determines the behavior* - is proven by the connector factory in `connectable`/`multicast`. The `publish*` family is `multicast` with a fixed Subject; `share` and `shareReplay` add ref-counting and reset on top of a `Subject` and a `ReplaySubject(n)` respectively. Choosing a multicast operator is identical to choosing a Subject variant: *what should late subscribers see?* (And always ⚠️ verify the `share`/`shareReplay` reset defaults against the docs.)
