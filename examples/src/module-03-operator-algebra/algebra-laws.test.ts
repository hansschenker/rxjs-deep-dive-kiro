/**
 * Module 3 — The Operator Algebra
 * Section: "Step 11: Key laws to remember"
 *
 * Each test proves one row of the course's law table against rxjs@7.8.2:
 *   Associativity of concat:  concat(a, concat(b, c)) ≡ concat(concat(a, b), c)
 *   Identity of merge:        merge(source, EMPTY)     ≡ source
 *   Functor identity:         map(x => x)              ≡ source      (see functor-laws.test.ts)
 *   Functor composition:      map(f) then map(g)       ≡ map(g ∘ f)  (see functor-laws.test.ts)
 *   Filter fusion:            filter(p) then filter(q) ≡ filter(p && q) (see filter-laws.test.ts)
 *   switchMap collapse:       switchMap(x => of(x))    ≡ map(x => x) ≡ source
 */
import { describe, it } from 'vitest';
import { concat, EMPTY, map, merge, of, switchMap } from 'rxjs';
import { marble } from '../testing/scheduler';

describe('Module 3 — key algebra laws', () => {
  it('Associativity of concat: concat(a, concat(b,c)) ≡ concat(concat(a,b), c)', () => {
    marble(({ cold, expectObservable }) => {
      const a$ = cold('a-a|', { a: 'a' });
      const b$ = cold('b-b|', { b: 'b' });
      const c$ = cold('c-c|', { c: 'c' });

      // Each source completes at its '|' frame; concat subscribes the next source
      // at exactly that frame. a-a| completes at frame 3, so b starts at 3, etc.
      const expected = 'a-ab-bc-c|';
      const values = { a: 'a', b: 'b', c: 'c' };

      // concat subscribes left-to-right regardless of grouping, so both nest the same way
      expectObservable(concat(a$, concat(b$, c$))).toBe(expected, values);
    });

    marble(({ cold, expectObservable }) => {
      const a$ = cold('a-a|', { a: 'a' });
      const b$ = cold('b-b|', { b: 'b' });
      const c$ = cold('c-c|', { c: 'c' });
      expectObservable(concat(concat(a$, b$), c$)).toBe('a-ab-bc-c|', {
        a: 'a',
        b: 'b',
        c: 'c',
      });
    });
  });

  it('Identity of merge: merge(source, EMPTY) ≡ source', () => {
    marble(({ cold, expectObservable }) => {
      const source$ = cold('--a--b--c|', { a: 1, b: 2, c: 3 });
      expectObservable(merge(source$, EMPTY)).toBe('--a--b--c|', {
        a: 1,
        b: 2,
        c: 3,
      });
    });
  });

  it('switchMap collapse: switchMap(x => of(x)) ≡ source', () => {
    marble(({ cold, expectObservable }) => {
      const source$ = cold('--a--b--c|', { a: 1, b: 2, c: 3 });
      // each inner of(x) emits-and-completes synchronously, so timing is preserved
      const collapsed$ = source$.pipe(switchMap((x) => of(x)));
      const viaMap$ = source$.pipe(map((x) => x));

      expectObservable(collapsed$).toBe('--a--b--c|', { a: 1, b: 2, c: 3 });
      expectObservable(viaMap$).toBe('--a--b--c|', { a: 1, b: 2, c: 3 });
    });
  });
});
