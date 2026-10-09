# Module 6 - Schedulers as the Clock

> **Prerequisites:** [Module 4 - Time Algebra](./module-04-time-algebra.md) and [Module 5 - Operators as Mealy Machines](./module-05-mealy-machines.md).
>
> **What you'll learn:** What a Scheduler actually *is*, how the four production schedulers map onto the JavaScript event loop, how a scheduler acts as the **clock** of the operator automaton, and why injecting that clock makes virtual-time testing possible.

Module 4 said "every timed operator defers to a Scheduler." Module 5 said "every operator is a machine." This module fuses them: a Scheduler is the **clock** that drives the timed transitions of those machines.

---

## Step 1: What a Scheduler is

A Scheduler is three things bundled together:

```
Scheduler = (Clock, Queue, Execution Context)
```

- **Clock** - a notion of "now."
- **Queue** - ordered pending work (actions).
- **Execution Context** - *how/when* queued work actually runs (sync stack, microtask, macrotask, animation frame).

The interface is tiny:

```ts
interface SchedulerLike {
  now(): number;                                  // the clock
  schedule<T>(work: (state) => void,
              delay?: number,
              state?: T): Subscription;           // enqueue work
}
```

`now()` is the clock; `schedule()` enqueues work to run after an optional delay and hands back a `Subscription` you can cancel.

---

## Step 2: The four production schedulers

They are distinguished by their **execution context**, which maps directly onto layers of the JS event loop.

| Scheduler                 | Backed by                 | Runs…                         | Use when…                                   |
|---------------------------|---------------------------|-------------------------------|---------------------------------------------|
| `queueScheduler`          | synchronous trampoline    | now, on the current stack     | recursive synchronous emission (recursion-safe) |
| `asapScheduler`           | `Promise` microtask       | end of current task, before paint | you want ASAP but off the current stack |
| `animationFrameScheduler` | `requestAnimationFrame`   | just before the next repaint  | visual/animation work                       |
| `asyncScheduler`          | `setInterval` (macrotask) | later, as a macrotask         | **default** for timed ops (`delay`, `interval`, …) |

Event-loop layering (earlier = runs sooner within a turn):

```
┌─────────────────────────────────────────────────────────┐
│ current synchronous stack ....... queueScheduler          │  trampoline
├─────────────────────────────────────────────────────────┤
│ microtask queue (Promises) ...... asapScheduler           │  before paint
├─────────────────────────────────────────────────────────┤
│ requestAnimationFrame ........... animationFrameScheduler │  before repaint
├─────────────────────────────────────────────────────────┤
│ macrotask (setTimeout/Interval).. asyncScheduler (DEFAULT)│  next task
└─────────────────────────────────────────────────────────┘
```

---

## Step 3: Scheduler as the clock of the automaton

Combine Module 5's Mealy machine with a clock and you get a **Timed Mealy Machine**:

```
TimedM = (Q, Σ, Λ, δ, λ, q₀) + (C, Scheduler)
```

where `C` is a set of **clocks/timers** and the Scheduler supplies `now()` and `schedule()`. Such a machine has **two flavors of transition**:

- **INPUT transitions** - fired by `next` / `complete` / `error` (as before).
- **TIMED transitions** - fired by the Scheduler when a scheduled time arrives.

### Worked example: `debounceTime(300)` as a timed automaton

```
Q = { idle, pending(timerId, lastValue) }
q₀ = idle

INPUT  δ(idle,    next(v)) = pending(schedule(fire, 300), v)
INPUT  δ(pending, next(v)) = pending(reschedule(fire, 300), v)   ← cancel old timer, start new
TIMED  δ(pending, fire)    = idle                                 ← and λ emits lastValue
```

Every incoming value **reschedules** the 300ms timer; the value is emitted only when a timed transition finally fires without interruption. This is debounce ("wait for silence") expressed as a two-state timed machine.

---

## Step 4: How `schedule()` dispatches

1. **Action** - `schedule()` wraps the work in an *Action*, a reified (first-class) unit of work that remembers its delay and state.
2. **Underlying timer** - the Action asks its scheduler to arrange execution (e.g. `asyncScheduler` ultimately uses `setInterval`).
3. **Flush** - when due, the scheduler **flushes**: it runs the queued action(s) in order.
4. **Recycle / cancel** - the returned `Subscription` can cancel the Action; unsubscribing an `asyncScheduler` action effectively does `clearInterval`.

### Recursive scheduling - how `interval` loops

`interval()` does not use a repeating native timer conceptually; it **re-schedules itself**:

```
schedule(function tick(state) {
  this.emit(state);                 // λ: emit the counter
  this.schedule(state + 1, period); // δ: reschedule the SAME action for the next period
}, period, 0);
```

Each tick enqueues the next tick. **Unsubscribing breaks the chain** - the pending re-schedule is cancelled, so no further ticks are enqueued.

---

## Step 5: Concurrency without threads

JavaScript is **single-threaded**. Schedulers therefore provide **cooperative concurrency**, not parallelism:

- Actions are interleaved **deterministically** on the event loop, ordered by `(dueTime, insertionOrder)`.
- There is **no real parallelism** and therefore **no race conditions** of the shared-memory kind.
- **Ties at the same instant** (equal `dueTime`) are broken by **insertion order** - first scheduled, first run.

```
Two actions due at t = 100, scheduled in order A then B:
  flush order ──▶ A, then B   (deterministic, every run)
```

This determinism is what makes virtual-time testing (Step 9) exact.

---

## Step 6: `queueScheduler` and trampolining

Naive recursive emission can blow the stack:

```
emit → handler → emit → handler → emit → …   (nested, grows the call stack)
```

The `queueScheduler` **trampolines**: if the queue is *already flushing*, new work is **enqueued** rather than invoked nested.

```
Without trampoline:  f() { … f() … }      → deep nesting → stack overflow
With trampoline:     enqueue; outer loop drains the queue → flat iteration, constant stack
```

Deep recursion becomes a flat loop with constant stack depth. This is why `queueScheduler` is the safe choice for synchronous recursive algorithms expressed as streams.

---

## Step 7: Choosing a scheduler

```
Need it on the current stack, recursion-safe?          → queueScheduler
Need it ASAP but off the current stack (before paint)? → asapScheduler
Doing visual/animation work tied to repaint?           → animationFrameScheduler
Timed operator / general async (the usual case)?       → asyncScheduler  (default)
Writing a test?                                         → TestScheduler (virtual)
```

---

## Step 8: Where schedulers plug in

### Creation operators (trailing scheduler argument)
```js
range(1, 1000, queueScheduler);          // emit synchronously but recursion-safe
of('a', 'b', 'c', asapScheduler);        // emit on the microtask queue
interval(1000, animationFrameScheduler); // tick in sync with repaint
```

### Scheduling operators
```js
source$.pipe(observeOn(asyncScheduler));   // controls DOWNSTREAM delivery (when values arrive at observers)
source$.pipe(subscribeOn(asyncScheduler)); // controls UPSTREAM subscription timing (when the producer starts)
```

- **`observeOn`** reschedules *emissions to subscribers*.
- **`subscribeOn`** reschedules *the subscription itself* (when the source is kicked off).

### Concurrency control via `mergeMap`
`mergeMap`'s second argument is a **max-concurrency** limit - a semaphore on active inner subscriptions:

```js
source$.pipe(mergeMap(fetchItem, 3));   // at most 3 inner subscriptions active at once
source$.pipe(mergeMap(fetchItem, 1));   // ≡ concatMap(fetchItem)   (one at a time, ordered)
```

```
   active set (size ≤ 3)      waiting queue
   ┌───┬───┬───┐              ┌───┬───┬───┐
   │ a │ b │ c │   ◀── when one finishes, pull ── │ d │ e │ f │
   └───┴───┴───┘              └───┴───┴───┘
```

> ✅ **Verified** against `rxjs@7.8.2`: `mergeMap(f, 1) ≡ concatMap(f)` (concurrency 1
> is sequential) is proven in
> [`examples/src/module-06-schedulers/scheduler-behavior.test.ts`](https://github.com/hansschenker/rxjs-deep-dive-kiro/blob/main/examples/src/module-06-schedulers/scheduler-behavior.test.ts),
> which also verifies the concurrency-semaphore behavior and the queue/asap execution
> contexts. The exact semantics of `observeOn`/`subscribeOn` remain unverified here —
> confirm against rxjs.dev for your version.

---

## Step 9: The virtual-time payoff

Because the clock is **injected** (not hardcoded as `setTimeout`), tests can substitute a **virtual clock** that leaps instantly from one scheduled time to the next:

```js
import { TestScheduler } from 'rxjs/testing';

const scheduler = new TestScheduler((a, e) => expect(a).toEqual(e));

scheduler.run(({ cold, expectObservable }) => {
  const source$ = cold('--a--b--c|');
  const result$ = source$.pipe(delay(30));
  expectObservable(result$).toBe('-----a--b--c|'); // frame-counted, illustrative
});
```

- `run()` provides `cold`, `hot`, `expectObservable`, and friends.
- Marble strings are **frame-counted** virtual time, not wall-clock time.
- The virtual clock **leaps** from scheduled time to scheduled time, so *hours* of logical time execute in *milliseconds* of real time, deterministically.

This is only possible because **time is injected, not hardcoded**. The clock is a parameter of the system.

---

## Full architecture

```
            ┌──────────────────────────────────────────────┐
            │                 OPERATOR                       │
            │   Timed Mealy Machine (Q, Σ, Λ, δ, λ, q₀)       │
            │        + clocks C                               │
            └───────────────┬───────────────┬────────────────┘
            INPUT transitions│               │TIMED transitions
                             │               │
                             ▼               ▼
                    ┌───────────────────────────────┐
                    │          SCHEDULER             │
                    │  now()   schedule(work,delay)  │
                    │  Queue ordered by (due, insert)│
                    └───────────────┬───────────────┘
                                    │ flush
             ┌──────────────┬───────┼────────┬───────────────┐
             ▼              ▼       ▼         ▼               ▼
         queue(sync)   asap(micro) rAF   async(macro)   TestScheduler
                                                         (virtual clock)
```

---

## Key takeaway

A **Scheduler** is a `(Clock, Queue, Execution Context)` that acts as the **clock of the operator automaton**, adding *timed transitions* to the input transitions from Module 5. The four production schedulers map onto event-loop layers (`queue` → sync, `asap` → microtask, `animationFrame` → repaint, `async` → macrotask default). Concurrency is cooperative and deterministic (ordered by due time then insertion), `mergeMap`'s concurrency arg is a semaphore, and because the clock is *injected*, `TestScheduler` can run virtual time instantly and deterministically.
