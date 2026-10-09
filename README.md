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
| 1 | [Origins & Lineage](./docs/modules/module-01-lineage.md) | Where RxJS comes from: set theory → Haskell → LINQ → Rx.NET → RxJS |
| 2 | [Operators as Domain-Invariant Algebra](./docs/modules/module-02-domain-invariance.md) | The domain changes, the operators do not |
| 3 | [The Operator Algebra](./docs/modules/module-03-operator-algebra.md) | Observables + operators + laws, operator by operator |
| 4 | [Time Algebra](./docs/modules/module-04-time-algebra.md) | Generate, shift, and sample across the time axis |
| 5 | [Operators as Mealy Machines](./docs/modules/module-05-mealy-machines.md) | Every operator is a state machine |
| 6 | [Schedulers as the Clock](./docs/modules/module-06-schedulers.md) | Who decides *when* work runs |
| 7 | [Subjects: the Fork in the Dataflow](./docs/modules/module-07-subjects.md) | Observer + Observable, the multicast hinge |
| 8 | [Multicasting = Subject + Lifecycle](./docs/modules/module-08-multicasting.md) | Every multicast operator is a Subject plus a lifecycle policy |

## Runnable examples & law verification

The [`examples/`](./examples/) directory turns the course's conceptual claims into
**executable, verified code**. It is a self-contained `rxjs` + `vitest` project whose
marble tests prove the algebraic laws and operator equivalences against a pinned RxJS
version — directly discharging the "⚠️ Verify before teaching" caveats above.

```bash
cd examples
npm install
npm test        # run the law-verification suite
```

See [`examples/README.md`](./examples/README.md) for the full map of which test file
verifies which module and section.

## Running the docs site

This repo doubles as a [VitePress](https://vitepress.dev) documentation site. The 8 modules live under `docs/modules/`. Requires **Node 18+**.

```bash
npm install          # install VitePress (needs npm-registry access)
npm run docs:dev     # start the local dev server (http://localhost:5173)
npm run docs:build   # build the static site into docs/.vitepress/dist/
npm run docs:preview # preview the built site locally
```

## Credits

The main contributor to this project is Kiro, which authored the course content across a collaborative deep-dive session.

## The one idea

If you remember nothing else: **RxJS is an algebra**. Observables are the values, operators are the operations, and a small set of laws governs how they compose. The domain (clicks, HTTP, sensors, stock ticks) is irrelevant to the algebra, exactly as ordinary algebra does not care whether `x` counts apples or electrons.
