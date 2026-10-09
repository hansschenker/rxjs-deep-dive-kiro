/**
 * Module 3 — The Operator Algebra
 * Section: "Step 9: scan vs reduce — fold over time"
 *
 * Verifies the course diagram:
 *   source:                 --1--2--3|
 *   scan((a,b)=>a+b, 0):    --1--3--6|   (every running total)
 *   reduce((a,b)=>a+b, 0):  ---------6|  (one value, only on complete)
 *
 * Plus the state-management corollary: a reducer over an action stream is a scan.
 */
import { describe, it } from 'vitest';
import { reduce, scan } from 'rxjs';
import { marble } from '../testing/scheduler';

describe('Module 3 — scan vs reduce', () => {
  it('scan emits every intermediate running total', () => {
    marble(({ cold, expectObservable }) => {
      const source$ = cold('--1--2--3|', { 1: 1, 2: 2, 3: 3 });
      expectObservable(source$.pipe(scan((acc, x) => acc + x, 0))).toBe(
        '--a--b--c|',
        { a: 1, b: 3, c: 6 },
      );
    });
  });

  it('reduce emits only the final value, and only on complete', () => {
    marble(({ cold, expectObservable }) => {
      const source$ = cold('--1--2--3|', { 1: 1, 2: 2, 3: 3 });
      expectObservable(source$.pipe(reduce((acc, x) => acc + x, 0))).toBe(
        '---------(a|)',
        { a: 6 },
      );
    });
  });

  it('scan is a Redux-style reducer over an action stream', () => {
    marble(({ cold, expectObservable }) => {
      type Action = { type: 'inc' } | { type: 'dec' };
      const reducer = (state: number, action: Action) =>
        action.type === 'inc' ? state + 1 : state - 1;

      const actions$ = cold<Action>('--i--i--d|', {
        i: { type: 'inc' },
        d: { type: 'dec' },
      });

      const state$ = actions$.pipe(scan(reducer, 0));
      expectObservable(state$).toBe('--a--b--c|', { a: 1, b: 2, c: 1 });
    });
  });
});
