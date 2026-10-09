# Module 5 - Operators as Mealy Machines

> **Prerequisites:** [Module 3 - The Operator Algebra](./module-03-operator-algebra.md). Helpful: a vague memory of finite automata.
>
> **What you'll learn:** A formal lens in which *every* RxJS operator is a **Mealy machine** (a state machine whose output depends on state *and* input). This lens gives you memory analysis, termination analysis, and equivalence proofs for free.

Module 3 gave us the algebra. This module gives us the *machine*. It turns out that each operator is a small automaton consuming the Observable grammar as its input alphabet - and once you see that, questions like "will this leak memory?" or "will this ever terminate?" become mechanical.

---

## Step 1: What is a Mealy machine?

A **Mealy machine** is a 6-tuple:

```
M = (Q, Σ, Λ, δ, λ, q₀)
```

| Symbol | Name              | Meaning                                   |
|--------|-------------------|-------------------------------------------|
| `Q`    | states            | the set of possible internal states       |
| `Σ`    | input alphabet    | the symbols the machine consumes           |
| `Λ`    | output alphabet   | the symbols the machine emits              |
| `δ`    | transition fn     | `δ : Q × Σ → Q` (next state)               |
| `λ`    | output fn         | `λ : Q × Σ → Λ` (what to emit)             |
| `q₀`   | initial state     | where it starts                            |

The defining feature: in a **Mealy** machine the output `λ` depends on **state *and* input**. (Contrast **Moore**, where output depends on state *only*.) RxJS operators are Mealy because what they emit on a `next(v)` depends both on what they have seen (state) and on `v` (input).

---

## Step 2: Why RxJS fits

The **input alphabet** of every operator is the Observable grammar from Module 3:

```
Σ = { next(v) : v ∈ T } ∪ { complete } ∪ { error(e) }
```

Every operator is a machine that consumes these symbols and, via `λ`, produces output symbols from the same vocabulary (possibly transformed). The subscription *is* the running machine; `complete`/`error` drive it into terminal states.

---

## Step 3: Worked example - `scan((acc, x) => acc + x, 0)`

```
Q  = ℤ            (the accumulator IS the state)
Σ  = { next(x), complete, error }
Λ  = { next(sum), complete, error }
q₀ = 0
δ(q, next(x))      = q + x          λ(q, next(x))      = next(q + x)
δ(q, complete)     = (terminal)     λ(q, complete)     = complete
δ(q, error(e))     = (terminal)     λ(q, error(e))     = error(e)
```

Execution trace for `--1--2--3|`:

| Input        | State before | State after | Output      |
|--------------|-------------:|------------:|-------------|
| `next(1)`    | 0            | 1           | `next(1)`   |
| `next(2)`    | 1            | 3           | `next(3)`   |
| `next(3)`    | 3            | 6           | `next(6)`   |
| `complete`   | 6            | -           | `complete`  |

State diagram (edges labeled `input / output`):

```
         next(1)/next(1)   next(2)/next(3)   next(3)/next(6)
   (0) ───────────────▶ (1) ─────────────▶ (3) ─────────────▶ (6) ──complete/complete──▶ ⊠
```

---

## Step 4: Worked example - `distinctUntilChanged`

```
Q  = T ∪ {⊥}      (⊥ = "nothing seen yet")
q₀ = ⊥
δ(q, next(v)) = v                              (remember the latest)
λ(q, next(v)) = next(v)  if v ≠ q  else (suppress)
```

Execution trace for `--a--a--b--b--a|`:

| Input       | State before | Emit?        | Output     | State after |
|-------------|:------------:|:------------:|------------|:-----------:|
| `next(a)`   | ⊥            | yes (a ≠ ⊥)  | `next(a)`  | a           |
| `next(a)`   | a            | no (a = a)   | -          | a           |
| `next(b)`   | a            | yes (b ≠ a)  | `next(b)`  | b           |
| `next(b)`   | b            | no           | -          | b           |
| `next(a)`   | b            | yes (a ≠ b)  | `next(a)`  | a           |

Note it is **Mealy, not Moore**: the output decision compares the **state** (`q`) against the **input** (`v`). Output depends on both, which is exactly the Mealy property.

---

## Step 5: Worked example - `take(2)`

```
Q  = {0, 1, 2}    (count of values emitted so far)
q₀ = 0
δ(0, next(v)) = 1   λ(0, next(v)) = next(v)
δ(1, next(v)) = 2   λ(1, next(v)) = next(v), then complete
δ(2, …)       = done (unsubscribed)
```

Because `Q` is **finite**, `take(2)` is a genuine **finite automaton** that reaches an accepting/done state and terminates:

```
   next/next        next/next, then complete
 (0) ─────────▶ (1) ─────────────────────────▶ (2 = done) ──▶ ⊠
```

---

## Step 6: Classification by |Q| - the engineering payoff

The size of the state set tells you the operator's memory and termination profile.

| Class        | \|Q\|         | Examples                                   | Properties                        |
|--------------|---------------|--------------------------------------------|-----------------------------------|
| **Stateless**| \|Q\| = 1     | `map`, `filter`, `mapTo`, `tap`            | degenerate Mealy = pure function  |
| **FSM**      | \|Q\| finite  | `take`, `skip`, `first`, `bufferCount`     | bounded memory, can terminate     |
| **Unbounded**| \|Q\| infinite| `scan`, `reduce`, `distinct`, `buffer`, `toArray` | memory grows with input (risk) |

Two concrete engineering consequences:

- **`distinct()` on an infinite stream is a memory leak.** Its state set is the set of all values seen; on an unbounded source that set grows forever.
- **`toArray()` never emits on an infinite source.** It buffers everything and only emits on `complete`, which never comes.

Reading an operator's `|Q|` *before* using it is a cheap way to predict these failure modes.

---

## Step 7: `map` and `filter` as degenerate (|Q| = 1) Mealy machines

```
map(f):     Q = {•}   (one state, no memory)
            δ(•, next(v)) = •        λ(•, next(v)) = next(f(v))

filter(p):  Q = {•}
            δ(•, next(v)) = •        λ(•, next(v)) = next(v) if p(v) else (suppress)
```

With a single state there is no memory, so the output depends on the **input alone** - i.e. the operator is a **pure function** lifted over the stream. That is *precisely* why `map` is a **Functor** (Module 3): a stateless Mealy machine is a function, and functions compose by the Functor laws.

---

## Step 8: Flattening operators as Mealy machines with Observable state

The four flatteners from Module 3 are Mealy machines whose **state is a set of inner subscriptions**. They differ in *one place only* - the transition function `δ` on a new outer value.

`switchMap` sketch:

```
Q  = { current inner Subscription | none }
q₀ = none
δ(q, next(outer)):
     if q is an active subscription: unsubscribe(q)      ← "switch"
     subscribe(inner(outer)) and store as new state
```

The four flatteners, side by side, differ *only* in `δ`:

| Operator    | `δ` on a new outer value              | One-line description |
|-------------|---------------------------------------|----------------------|
| `switchMap` | unsubscribe old, subscribe new        | **replace**          |
| `mergeMap`  | add new to the active set             | **accumulate**       |
| `concatMap` | enqueue; subscribe when current done  | **queue**            |
| `exhaustMap`| if an inner is active, ignore new     | **drop**             |

Same tuple, same `Σ`, same `Λ` - a single differing transition rule produces four very different operators. That is the power of the formal lens: it isolates *exactly* what differs.

---

## Step 9: Composition = product of machines

What does `pipe(M1, M2, M3)` look like as a machine? It is the **product automaton**:

```
Q  = Q₁ × Q₂ × Q₃          (state is the tuple of sub-states)
q₀ = (q₀₁, q₀₂, q₀₃)
```

Each incoming symbol flows through `M1`, whose output feeds `M2`, whose output feeds `M3`. The **product of Mealy machines is itself a Mealy machine**, which is the automata-theoretic restatement of Module 3's *closure under composition*: pipe a bunch of operators and you still have an operator.

---

## Step 10: Why this lens is powerful

- **Memory analysis.** `|Q|` finite ⇒ bounded memory; infinite ⇒ potential leak. (Section 6.)
- **Termination analysis.** A reachable accepting/done state ⇒ the operator can complete (`take`); no such state ⇒ it runs forever.
- **Equivalence proofs.** `map(f) ∘ map(g)` and `map(g ∘ f)` both **minimize to the same single-state machine** (|Q| = 1), proving the Functor composition law mechanically.
- **Cancellation semantics.** `switchMap`'s "cancel previous" is just its `δ` calling `unsubscribe` - the semantics fall out of the transition function, not from special-case documentation.
- **Testability.** A machine with explicit states and transitions is directly expressible as a table-driven test.

> ✅ **Verified** against `rxjs@7.8.2`: the worked traces (`scan`, `distinctUntilChanged`,
> `take`) and the `|Q|`-classification consequences (`take` terminates even on an infinite
> source; `toArray` never emits on one) are asserted in
> [`examples/src/module-05-mealy-machines/machine-traces.test.ts`](https://github.com/hansschenker/rxjs-deep-dive-kiro/blob/main/examples/src/module-05-mealy-machines/machine-traces.test.ts).

---

## Key takeaway

Every RxJS operator is a **Mealy machine** `(Q, Σ, Λ, δ, λ, q₀)` consuming the Observable grammar. Its **state set size** predicts memory and termination (stateless `map`/`filter`, finite `take`, unbounded `scan`/`distinct`). The four flatteners differ in a single transition rule, composition is the **product machine** (so the algebra stays closed), and classic laws like `map(f) ∘ map(g) ≡ map(g ∘ f)` become minimizations of equivalent automata.
