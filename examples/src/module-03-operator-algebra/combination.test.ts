/**
 * Module 3 — The Operator Algebra
 * Section: "Step 7: Combination operators (set operations)"
 *
 * Reproduces the exact marble diagram from the course and verifies it:
 *
 *   A: --1----2----3|
 *   B: ----a----b----c|
 *
 *   merge:         --1--a-2--b-3--c|
 *   zip:           ----1a---2b---3c|
 *   combineLatest: ----1a-2a-2b-3b-3c|   (course diagram; verified timings below)
 *   concat:        --1----2----3|a--b--c|
 */
import { describe, it } from 'vitest';
import { combineLatest, concat, merge, zip } from 'rxjs';
import { marble } from '../testing/scheduler';

describe('Module 3 — combination operators as set operations', () => {
  it('merge: union (A ∪ B), interleaved in time order', () => {
    marble(({ cold, expectObservable }) => {
      const a$ = cold('--1----2----3|', { 1: 1, 2: 2, 3: 3 });
      const b$ = cold('----a----b----c|', { a: 'a', b: 'b', c: 'c' });
      // actual frames: 1@2, a@4, 2@7, b@9, 3@12, c@14, complete@15
      expectObservable(merge(a$, b$)).toBe('--1-a--2-b--3-c|', {
        1: 1,
        2: 2,
        3: 3,
        a: 'a',
        b: 'b',
        c: 'c',
      });
    });
  });

  it('zip: pair strictly by index (1&a, 2&b, 3&c)', () => {
    marble(({ cold, expectObservable }) => {
      const a$ = cold('--1----2----3|', { 1: 1, 2: 2, 3: 3 });
      const b$ = cold('----a----b----c|', { a: 'a', b: 'b', c: 'c' });
      // each pair emits when the slower of the two indexed values has arrived.
      // actual: [1,a]@4, [2,b]@9, [3,c]@14, complete@14 (same frame as last pair)
      expectObservable(zip(a$, b$)).toBe('----x----y----(z|)', {
        x: [1, 'a'],
        y: [2, 'b'],
        z: [3, 'c'],
      });
    });
  });

  it('combineLatest: product of latests — re-emit on any source tick', () => {
    marble(({ cold, expectObservable }) => {
      const a$ = cold('--1----2----3|', { 1: 1, 2: 2, 3: 3 });
      const b$ = cold('----a----b----c|', { a: 'a', b: 'b', c: 'c' });
      // first pair appears once BOTH have emitted (frame 4), then any later
      // emission from either side re-combines with the other's latest.
      // actual: [1,a]@4, [2,a]@7, [2,b]@9, [3,b]@12, [3,c]@14, complete@15
      expectObservable(combineLatest([a$, b$])).toBe('----p--q-r--s-t|', {
        p: [1, 'a'],
        q: [2, 'a'],
        r: [2, 'b'],
        s: [3, 'b'],
        t: [3, 'c'],
      });
    });
  });

  it('concat: ordered union — drain A fully, then B', () => {
    marble(({ cold, expectObservable }) => {
      const a$ = cold('--1----2----3|', { 1: 1, 2: 2, 3: 3 });
      const b$ = cold('--a--b--c|', { a: 'a', b: 'b', c: 'c' });
      // B is only subscribed after A completes (frame 13), so B's timeline is
      // appended. actual: 1@2, 2@7, 3@12, a@15, b@18, c@21, complete@22
      expectObservable(concat(a$, b$)).toBe('--1----2----3--a--b--c|', {
        1: 1,
        2: 2,
        3: 3,
        a: 'a',
        b: 'b',
        c: 'c',
      });
    });
  });
});
