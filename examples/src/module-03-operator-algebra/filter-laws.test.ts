/**
 * Module 3 — The Operator Algebra
 * Section: "Step 4: filter — membership"
 *
 * Verifies the filter laws:
 *   Identity:     filter(() => true)   ≡  source
 *   Annihilation: filter(() => false)  ≡  EMPTY  (completes with no values)
 *   Composition:  filter(p) then filter(q) ≡ filter(x => p(x) && q(x))
 */
import { describe, it } from 'vitest';
import { filter } from 'rxjs';
import { marble } from '../testing/scheduler';

const p = (x: number) => x > 2;
const q = (x: number) => x % 2 === 0;

describe('Module 3 — filter laws', () => {
  it('Identity law: filter(() => true) ≡ source', () => {
    marble(({ cold, expectObservable }) => {
      const source$ = cold('--a--b--c|', { a: 1, b: 2, c: 3 });
      expectObservable(source$.pipe(filter(() => true))).toBe('--a--b--c|', {
        a: 1,
        b: 2,
        c: 3,
      });
    });
  });

  it('Annihilation law: filter(() => false) ≡ EMPTY (completes, no values)', () => {
    marble(({ cold, expectObservable }) => {
      const source$ = cold('--a--b--c|', { a: 1, b: 2, c: 3 });
      // all values dropped; the completion still arrives at the same frame (9)
      expectObservable(source$.pipe(filter(() => false))).toBe('---------|');
    });
  });

  it('Composition law: filter(p) then filter(q) ≡ filter(p && q)', () => {
    marble(({ cold, expectObservable }) => {
      const source$ = cold('a-b-c-d|', { a: 1, b: 2, c: 3, d: 4 });

      const chained$ = source$.pipe(filter(p), filter(q));
      const fused$ = source$.pipe(filter((x) => p(x) && q(x)));

      // x>2 && even  => only 4 survives
      const expected = '------d|';
      const values = { d: 4 };

      expectObservable(chained$).toBe(expected, values);
      expectObservable(fused$).toBe(expected, values);
    });
  });
});
