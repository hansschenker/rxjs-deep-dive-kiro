/**
 * Module 2 — Operators as Domain-Invariant Algebra
 * Sections: "The formal reason: Functors", "The practical power"
 *
 * The thesis: the domain changes, the operators do not. We verify two concrete
 * consequences:
 *
 *  1. `map(f)` is the SAME Functor operation over different containers — Array,
 *     Promise, and Observable — producing the same transformed contents.
 *  2. A pipeline is independent of its source: the identical pipeline run over a
 *     synchronous `of(...)` source and over a different source yields results that
 *     depend only on the values, not on where they came from ("test with of,
 *     deploy with webSocket").
 */
import { describe, it, expect } from 'vitest';
import { map, filter, scan, of, from, type Observable } from 'rxjs';
import { marble } from '../testing/scheduler';

const double = (x: number) => x * 2;

describe('Module 2 — map is one Functor over many containers', () => {
  it('Array: [1,2,3].map(double) applies f inside the container', () => {
    expect([1, 2, 3].map(double)).toStrictEqual([2, 4, 6]);
  });

  it('Promise: .then(double) applies f inside the future-value container', async () => {
    await expect(Promise.resolve(21).then(double)).resolves.toBe(42);
  });

  it('Observable: pipe(map(double)) applies f inside the values-in-time container', () => {
    marble(({ cold, expectObservable }) => {
      const source$ = cold('--a--b--c|', { a: 1, b: 2, c: 3 });
      expectObservable(source$.pipe(map(double))).toBe('--a--b--c|', {
        a: 2,
        b: 4,
        c: 6,
      });
    });
  });

  it('all three containers yield the same transformed contents', async () => {
    const input = [1, 2, 3];
    const arrayOut = input.map(double);
    const promiseOut = await Promise.all(input.map((x) => Promise.resolve(x).then(double)));
    const obsOut = await new Promise<number[]>((resolve) => {
      const acc: number[] = [];
      from(input).pipe(map(double)).subscribe({
        next: (v) => acc.push(v),
        complete: () => resolve(acc),
      });
    });
    expect(arrayOut).toStrictEqual([2, 4, 6]);
    expect(promiseOut).toStrictEqual(arrayOut);
    expect(obsOut).toStrictEqual(arrayOut);
  });
});

describe('Module 2 — a pipeline is independent of its source', () => {
  // The exact pipeline from the docs' "Swap domains without rewriting logic".
  const pipeline = (source$: Observable<number>) =>
    source$.pipe(
      filter((x) => x > 3),
      map((x) => x * x),
      scan((a, b) => a + b, 0),
    );

  it('run over of(1..5): same logic, deterministic result', async () => {
    const out = await new Promise<number[]>((resolve) => {
      const acc: number[] = [];
      pipeline(of(1, 2, 3, 4, 5)).subscribe({
        next: (v) => acc.push(v),
        complete: () => resolve(acc),
      });
    });
    // keep >3 => 4,5 ; square => 16,25 ; running sum => 16, 41
    expect(out).toStrictEqual([16, 41]);
  });

  it('run over a differently-shaped source with the same values: identical output', async () => {
    const out = await new Promise<number[]>((resolve) => {
      const acc: number[] = [];
      pipeline(from([1, 2, 3, 4, 5])).subscribe({
        next: (v) => acc.push(v),
        complete: () => resolve(acc),
      });
    });
    expect(out).toStrictEqual([16, 41]);
  });
});
