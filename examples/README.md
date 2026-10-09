# RxJS Deep Dive — Runnable Examples & Law Verification

This directory turns the **conceptual claims** of the [RxJS Deep Dive course](../README.md)
into **executable, verified code**. Every algebraic law and operator equivalence the
course states is backed here by a marble test that actually runs against real `rxjs`.

> The course docs carry a repeated ⚠️ *"Verify before teaching"* warning: treat every
> concrete claim as a hypothesis to confirm. This project **is** that verification layer —
> it uses the RxJS `TestScheduler` and marble diagrams to prove the laws for the pinned
> RxJS version.

## What's here

```
examples/
├── package.json            # real rxjs + vitest + tsx, pinned versions
├── tsconfig.json
├── vitest.config.ts
└── src/
    ├── testing/
    │   └── scheduler.ts     # shared TestScheduler helper (marble testing)
    ├── module-01-lineage/
    │   ├── pull-vs-push.ts          # runnable demo
    │   └── pull-vs-push.test.ts     # verified behavior
    ├── module-03-operator-algebra/
    │   ├── functor-laws.test.ts     # map identity + composition (fusion)
    │   ├── filter-laws.test.ts      # filter identity, annihilation, fusion
    │   ├── flattening.test.ts       # merge/concat/switch/exhaustMap behavior
    │   ├── combination.test.ts      # merge/zip/combineLatest/concat as set ops
    │   ├── scan-vs-reduce.test.ts   # fold-over-time vs fold-on-complete
    │   └── algebra-laws.test.ts     # the "key laws to remember" table
    ├── module-04-time-algebra/
    │   └── time-operators.test.ts   # delay / debounceTime / throttleTime
    └── module-08-multicasting/
        └── subject-connectors.test.ts  # behavior follows the Subject
```

Each test file names the exact course module and section it verifies, so you can read a
claim in the docs and jump straight to the test that proves it.

## Running it

Requires **Node 18+**. From this `examples/` directory:

```bash
npm install        # install rxjs, vitest, tsx
npm test           # run the whole law-verification suite once
npm run test:watch # re-run on change while you experiment
npm run typecheck  # type-check the examples with tsc
```

Run a single runnable demo (plain Node, prints to the console):

```bash
npm run example src/module-01-lineage/pull-vs-push.ts
```

## How the verification works

RxJS ships a `TestScheduler` that runs Observables in **virtual time**. A marble string
like `--a--b--|` is parsed into scheduled emissions; the pipeline is flushed
synchronously; and the recorded notifications are diffed against an expected marble
string. That is how a hand-drawn ASCII diagram in the course becomes a passing (or
failing) assertion.

See `src/testing/scheduler.ts` for the shared helper and the marble-syntax notes.

## Pinned versions

- `rxjs@7.8.2` — the laws and the `share`/`shareReplay` defaults are verified against
  this major version. Different majors (notably RxJS 6) differ in multicast reset
  defaults; re-run the suite after bumping.
- `vitest@2.1.8`, `typescript@5.6.3`, `tsx@4.19.2`.
