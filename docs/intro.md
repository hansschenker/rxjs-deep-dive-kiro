# RxJS Deep Dive

A conceptual course that treats RxJS not as a grab-bag of operators to memorize, but as a coherent **algebra over streams** with a traceable intellectual lineage, formal semantics, and a small set of invariant laws. By the end you should be able to reason about any operator from first principles rather than looking it up.

> ### ⚠️ Verify before teaching
> This draft was **AI-generated**. Before teaching any of this material to students, verify the following against the official [rxjs.dev](https://rxjs.dev) documentation and the exact RxJS version you target:
> - **Algebraic laws** (identity, composition, associativity, distributivity claims)
> - **Exact `shareReplay` / `share` default config values** (`refCount`, `resetOnError`, `resetOnComplete`, `resetOnRefCountZero`), which have changed across major versions
> - **Operator equivalences** (e.g. `mergeMap(f, 1) ≡ concatMap(f)`, `publish* ≡ multicast(() => Subject)`)
> - **Marble-diagram timings** and emission semantics
>
> Treat every concrete claim here as a hypothesis to confirm, not as settled fact.

---

## Who this course is for

Developers who already use RxJS at a surface level (`map`, `filter`, `switchMap`, `subscribe`) and want to understand *why* the library is shaped the way it is. You should be comfortable with JavaScript/TypeScript, higher-order functions, and the basics of Observables and subscription.

## How the course is structured

The modules build on each other. Early modules establish the **lineage** and the **algebra**; middle modules add formal lenses (**time**, **Mealy machines**, **schedulers**); later modules apply all of it to **Subjects** and **multicasting**.

```
 Lineage ──▶ Domain Invariance ──▶ Operator Algebra
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 ▼                        ▼                        ▼
            Time Algebra           Mealy Machines            Schedulers
                 └───────────────────────┼───────────────────────┘
                                         ▼
                                     Subjects
                                         ▼
                                   Multicasting
```

## Syllabus

| # | Module | Theme |
|---|--------|-------|
| 1 | [Origins & Lineage](/modules/module-01-lineage) | Where RxJS comes from: set theory → Haskell → LINQ → Rx.NET → RxJS |
| 2 | [Operators as Domain-Invariant Algebra](/modules/module-02-domain-invariance) | The domain changes, the operators do not |
| 3 | [The Operator Algebra](/modules/module-03-operator-algebra) | Observables + operators + laws, operator by operator |
| 4 | [Time Algebra](/modules/module-04-time-algebra) | Generate, shift, and sample across the time axis |
| 5 | [Operators as Mealy Machines](/modules/module-05-mealy-machines) | Every operator is a state machine |
| 6 | [Schedulers as the Clock](/modules/module-06-schedulers) | Who decides *when* work runs |
| 7 | [Subjects: the Fork in the Dataflow](/modules/module-07-subjects) | Observer + Observable, the multicast hinge |
| 8 | [Multicasting = Subject + Lifecycle](/modules/module-08-multicasting) | Every multicast operator is a Subject plus a lifecycle policy |

## Credits

The main contributor to this project is Kiro, which authored the course content across a collaborative deep-dive session.

## The one idea

If you remember nothing else: **RxJS is an algebra**. Observables are the values, operators are the operations, and a small set of laws governs how they compose. The domain (clicks, HTTP, sensors, stock ticks) is irrelevant to the algebra, exactly as ordinary algebra does not care whether `x` counts apples or electrons.
