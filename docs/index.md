---
layout: home

hero:
  name: RxJS Deep Dive
  tagline: A coherent algebra over streams, with a traceable intellectual lineage, formal semantics, and a small set of invariant laws.
  actions:
    - theme: brand
      text: Start the course
      link: /modules/module-01-lineage
    - theme: alt
      text: Intro & Syllabus
      link: /intro

features:
  - title: Origins & Lineage
    details: Where RxJS comes from - set theory to Haskell to LINQ to Rx.NET to RxJS.
  - title: The Operator Algebra
    details: Observables + operators + laws, operator by operator, as a genuine algebra.
  - title: Time, Machines & Schedulers
    details: Time algebra, operators as Mealy machines, and schedulers as the clock.
  - title: Subjects & Multicasting
    details: The multicast hinge and how every multicast operator is a Subject plus a lifecycle policy.
---

> ### ⚠️ Verify before teaching
> This draft was **AI-generated**. Before teaching any of this material to students, verify the following against the official [rxjs.dev](https://rxjs.dev) documentation and the exact RxJS version you target:
> - **Algebraic laws** (identity, composition, associativity, distributivity claims)
> - **Exact `shareReplay` / `share` default config values** (`refCount`, `resetOnError`, `resetOnComplete`, `resetOnRefCountZero`), which have changed across major versions
> - **Operator equivalences** (e.g. `mergeMap(f, 1) ≡ concatMap(f)`, `publish* ≡ multicast(() => Subject)`)
> - **Marble-diagram timings** and emission semantics
>
> Treat every concrete claim here as a hypothesis to confirm, not as settled fact.

## Credits

The main contributor to this project is Kiro, which authored the course content across a collaborative deep-dive session.

See the [Intro & Syllabus](/intro) for the full overview, course structure, and module list.
