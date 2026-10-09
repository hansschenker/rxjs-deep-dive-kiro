/**
 * Module 3 — The Operator Algebra
 * Section: "Step 3: map — the foundational Functor"
 *
 * Verifies the two Functor laws, by marble equality against the TestScheduler:
 *   Identity:     map(x => x)        ≡  source
 *   Composition:  map(f) then map(g) ≡  map(x => g(f(x)))   (the "fusion" law)
 *
 * Also verifies the structure-preservation claim: timing, order, and the
 * terminal notification (complete/error) all pass through map unchanged.
 */
import { describe, it } from 'vitest';
import { map } from 'rxjs';
import { marble } from '../testing/scheduler';

const f = (x: number) => x + 1;
const g = (x: number) => x * 10;

describe('Module 3 — Functor laws for map', () => {
  it('Identity law: map(x => x) ≡ source', () => {
    marble(({ cold, expectObservable }) => {
      const source$ = cold('--a--b--c|', { a: 1, b: 2, c: 3 });
      const mapped$ = source$.pipe(map((x) => x));
      expectObservable(mapped$).toBe('--a--b--c|', { a: 1, b: 2, c: 3 });
    });
  });

  it('Composition law: map(f) then map(g) ≡ map(g ∘ f)', () => {
    marble(({ cold, expectObservable }) => {
      const source$ = cold('--a--b--c|', { a: 1, b: 2, c: 3 });

      const twoMaps$ = source$.pipe(map(f), map(g));
      const fused$ = source$.pipe(map((x) => g(f(x))));

      // (1+1)*10=20, (2+1)*10=30, (3+1)*10=40
      const expected = '--x--y--z|';
      const values = { x: 20, y: 30, z: 40 };

      expectObservable(twoMaps$).toBe(expected, values);
      expectObservable(fused$).toBe(expected, values);
    });
  });

  it('structure preservation: timing and order are untouched', () => {
    marble(({ cold, expectObservable }) => {
      // irregular spacing — map must not shift any emission in virtual time
      const source$ = cold('a---b-c------d|', { a: 1, b: 2, c: 3, d: 4 });
      const mapped$ = source$.pipe(map((x) => x * 100));
      expectObservable(mapped$).toBe('a---b-c------d|', {
        a: 100,
        b: 200,
        c: 300,
        d: 400,
      });
    });
  });

  it('structure preservation: error passes through unchanged', () => {
    marble(({ cold, expectObservable }) => {
      const source$ = cold('--a--#', { a: 1 }, new Error('boom'));
      const mapped$ = source$.pipe(map((x) => x * 2));
      expectObservable(mapped$).toBe('--a--#', { a: 2 }, new Error('boom'));
    });
  });
});
