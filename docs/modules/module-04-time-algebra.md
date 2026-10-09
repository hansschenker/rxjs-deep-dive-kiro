# Module 4 - Time Algebra

> **Prerequisites:** [Module 3 - The Operator Algebra](./module-03-operator-algebra.md). You should be comfortable with marble diagrams and the Functor/Monad framing.
>
> **What you'll learn:** How RxJS adds a *time* dimension that set theory, Haskell, and LINQ lack, and the three fundamental time operations - **generate**, **shift**, **sample** - plus their laws and how virtual time makes all of it testable.

Everything in Module 3 treated values as if they existed "all at once." But the thing that makes RxJS *reactive* is that values are spread across **time**. This module is the algebra of that extra dimension.

---

## Step 1: Why time is a dimension

In set theory, Haskell, and LINQ the collection exists *simultaneously*:

```
{1, 2, 3}        - all three elements exist at once
[1, 2, 3]        - the whole list is "there"
```

In RxJS the same three values are smeared across a **time axis**:

```
 value
   ▲
 3 ┤                     ● (t = 40)
 2 ┤          ● (t = 20)
 1 ┤   ● (t = 5)
   └───┬──────┬──────────┬────────▶ time
       5      20         40
```

A stream is a function from *time* to *values*. That second axis gives us operations that have **no analogue** in the earlier levels of the lineage: you can generate values *from time itself*, you can *move* values along the axis, and you can *sample* a busy axis down to a manageable rate.

---

## Step 2: Three fundamental time operations

| Operation    | Question it answers                       | Operators                                   |
|--------------|-------------------------------------------|---------------------------------------------|
| **GENERATE** | "produce values *because* time passed"    | `interval`, `timer`                         |
| **SHIFT**    | "move values along the time axis"         | `delay`, `delayWhen`                        |
| **SAMPLE**   | "reduce a dense axis to chosen moments"   | `debounceTime`, `throttleTime`, `auditTime`, `sampleTime`, `sample` |

The rest of the module takes each in turn.

---

## Step 3: GENERATE - time as a source

```js
interval(1000);          // 0, 1, 2, 3, …  one per second (a metronome)
timer(3000);             // emits 0 once, after 3s, then completes
timer(3000, 1000);       // first after 3s, then every 1s thereafter
```

```
interval(1000):  --0--1--2--3--…      (every 1000ms)
timer(3000):     ------------0|        (once at 3000ms)
timer(3000,1000):------------0--1--2--… (3000ms, then every 1000ms)
```

This is the operation **impossible** in set theory or LINQ: here *time itself is an Observable source*. There is no "value" being transformed - the passage of time *is* the event.

---

## Step 4: SHIFT - arithmetic on the time axis

### `delay` - addition
`delay(d)` adds a constant `d` to every value's timestamp: `t → t + d`.

```
source:      --a--b--c|
delay(20):   ----a--b--c|   (every mark moved right by 20ms, completion too)
```

### `delayWhen` - variable shift
`delayWhen(v => signal$)` shifts each value by a *per-value* amount determined by an inner Observable: `t → t + f(value)`.

### Shift law
```
delay(a) then delay(b)  ≡  delay(a + b)
```
Delay is **additive**, exactly like addition on the real line. (Verify boundary behavior around `delay(0)` - see the laws section.)

---

## Step 5: SAMPLE - five strategies, one example

Sampling reduces a dense stream to selected moments. The five strategies differ in *when* they emit and *which* value they carry. Use this shared input for all five:

```
source:  a-b-c----d-e----f|
         └─burst─┘  └burst┘
```

| Operator                 | Mental model                     | Emits when…                        | Which value |
|--------------------------|----------------------------------|------------------------------------|-------------|
| `debounceTime(t)`        | "wait for silence"               | source quiet for `t`               | **last** before the silence |
| `throttleTime(t)`        | "rate limit, leading edge"       | first value, then mute for `t`     | **first** of each window |
| `auditTime(t)`           | "trailing edge rate limit"       | `t` after a value, then re-arm     | **last** of each window |
| `sampleTime(t)`          | "heartbeat / clock"              | every `t` ms on a fixed clock      | **latest** at the tick |
| `sample(notifier$)`      | "ask on demand"                  | when `notifier$` emits             | **latest** at that moment |

```
source:              a-b-c----d-e----f|
debounceTime:        ------c------e----f|   (last before each gap)
throttleTime:        a--------d--------f|   (first of each window)
auditTime:           ----c--------e----f|   (last of each window, trailing)
sampleTime(clock):   ---tick emits latest at each fixed tick---
```

`sample(notifier$)` is especially expressive - emit the latest value only when *another stream* says so:

```js
// Save the most recent GPS reading only when the user taps "Save"
gps$.pipe(sample(saveButton$));
```

---

## Step 6: WINDOWING - batching the axis

Two families collect values over time; they differ only in the *container* they produce.

| Family          | Produces              | Operators                     |
|-----------------|-----------------------|-------------------------------|
| `buffer*`       | **arrays** of values  | `bufferTime`, `bufferCount`   |
| `window*`       | **Observables** of values | `windowTime`, `windowCount`|

```
source:            --1-2-3--4-5-6--7|
bufferCount(3):    ------[1,2,3]----[4,5,6]--…   (emits ARRAYS)
windowCount(3):    an Observable that emits inner Observables of 3 values each
```

Rule of thumb: **`buffer*` = arrays, `window*` = Observables.** Reach for `window*` only when you need to keep operating reactively on each batch.

---

## Step 7: TIME-BASED COMBINATION

| Operator                      | Behavior                                              |
|-------------------------------|-------------------------------------------------------|
| `timeout(ms)`                 | error if no emission within the deadline              |
| `timeoutWith(ms, fallback$)`  | switch to a fallback stream instead of erroring       |
| `takeUntil(timer(10000))`     | time-bounded stream: complete after 10s               |
| `bufferToggle` / `windowToggle` | open and close batches driven by *other* streams    |

```js
http.get('/slow').pipe(
  timeout(5000),                        // deadline
  catchError(() => of(cachedValue))     // or combine with timeoutWith(5000, cached$)
);

liveFeed$.pipe(takeUntil(timer(10000))); // auto-stop after 10 seconds
```

---

## Step 8: Time algebra laws

```
Additivity:        delay(a) then delay(b)        ≡  delay(a + b)          ✅ verified
Distributivity:    delay(d)(merge(x, y))          ≡  merge(delay(d)(x), delay(d)(y))  ✅ verified
Near-identity:     delay(0)                        ≈  identity   (but it RESCHEDULES - see note)
Debounce absorbs:  debounceTime(a) then debounceTime(b)  behaves like the dominant (max) window
Throttle:          throttleTime is idempotent-ish - re-throttling a throttled stream rarely changes it
```

> ✅ **Verified** against `rxjs@7.8.2`: the **additivity** and **distributivity** laws
> (the two marked above) are proven by marble tests in
> [`examples/src/module-04-time-algebra/time-operators.test.ts`](https://github.com/hansschenker/rxjs-deep-dive-kiro/blob/main/examples/src/module-04-time-algebra/time-operators.test.ts).
> The debounce-absorption and throttle-idempotence claims remain unverified.

> **`delay(0)` is not a true identity.** It reschedules emissions onto a (default async) scheduler, so synchronous ordering can change even though values and timings *look* unchanged. This is the first hint that **a scheduler sits underneath every timed operator** (Module 6).

> ⚠️ Verify the exact absorption/idempotence behavior and marble timings against rxjs.dev before teaching; edge cases around leading/trailing config change the results.

---

## Step 9: Virtual time and marble testing

Here is the beautiful consequence of time being a *dimension the operators receive from a scheduler*: you can **replace real time with virtual time** and test timing-dependent logic deterministically and instantly.

```js
import { TestScheduler } from 'rxjs/testing';

const scheduler = new TestScheduler((actual, expected) => {
  expect(actual).toEqual(expected);
});

scheduler.run(({ cold, expectObservable }) => {
  const source$ = cold('--a--b--c|');
  const result$ = source$.pipe(debounceTime(3));
  //  marbles describe emissions at virtual frames; no real waiting happens.
  //  a and b are each interrupted within 3 frames; only c survives, flushed with
  //  the completion at frame 9.
  expectObservable(result$).toBe('---------(c|)'); // ✅ verified vs rxjs@7.8.2
});
```

The algebra is **identical** to production; the only thing that changed is that *time became a controllable variable*, because operators get their timing from an injected **Scheduler** rather than from `setTimeout` directly.

---

## Step 10: Schedulers overview (bridge to Module 6)

Every timed operator defers to a **Scheduler**, which decides *when and on what execution context* work runs:

| Scheduler                 | Backed by               | Role                               |
|---------------------------|-------------------------|------------------------------------|
| `asyncScheduler`          | `setInterval` (macrotask) | default for timed operators       |
| `asapScheduler`           | microtask / `Promise`   | run ASAP, before paint             |
| `animationFrameScheduler` | `requestAnimationFrame` | sync work to the repaint cycle     |
| `queueScheduler`          | synchronous trampoline  | immediate, recursion-safe          |
| `TestScheduler`           | **virtual** clock       | deterministic testing              |

Module 6 is devoted to these.

---

## Full time algebra map

```
                        TIME ALGEBRA
                             │
       ┌─────────────────────┼─────────────────────┐
       ▼                     ▼                     ▼
   GENERATE               SHIFT                 SAMPLE
   interval               delay (t→t+d)         debounceTime (silence)
   timer                  delayWhen (t→t+f(v))  throttleTime (leading)
   (time as source)                             auditTime    (trailing)
                                                sampleTime   (clock)
                                                sample($)    (on demand)
       │                     │                     │
       └───────────┬─────────┴─────────┬───────────┘
                   ▼                   ▼
              WINDOWING          COMBINE-IN-TIME
          buffer* → arrays        timeout / timeoutWith
          window* → observables   takeUntil(timer)
                                  buffer/windowToggle
                   │
                   ▼
            SCHEDULER (the clock) ──▶ Module 6
            virtual time ──▶ TestScheduler / marble tests
```

---

## Key takeaway

RxJS adds a **time axis** that earlier levels of the lineage lack, with three fundamental operations: **generate** values from time, **shift** values along the axis, and **sample** a dense axis down to chosen moments. These obey algebraic laws (delay is additive and distributes over merge), and because operators get their timing from an injectable **Scheduler**, you can swap real time for **virtual time** and test everything deterministically.
