/**
 * Module 5 — Operators as Mealy Machines
 * Sections: Steps 3, 4, 5 (worked traces), Step 6 (classification), Step 10
 *
 * Each operator is a Mealy machine consuming the Observable grammar. We verify the
 * exact execution traces the docs draw, plus the engineering consequences of the
 * |Q| classification (finite-state operators terminate; unbounded ones only emit
 * on complete).
 */
import { describe, it, expect } from 'vitest';
import { distinctUntilChanged, map, scan, take, toArray } from 'rxjs';
import { marble, recordFrames } from '../testing/scheduler';

describe('Module 5 — scan trace (state = accumulator, |Q| infinite)', () => {
  it('scan((acc,x)=>acc+x,0) over --1--2--3| emits running totals 1,3,6', () => {
    marble(({ cold, expectObservable }) => {
      const source$ = cold('--1--2--3|', { 1: 1, 2: 2, 3: 3 });
      expectObservable(source$.pipe(scan((acc, x) => acc + x, 0))).toBe(
        '--a--b--c|',
        { a: 1, b: 3, c: 6 },
      );
    });
  });
});

describe('Module 5 — distinctUntilChanged trace (Mealy: output compares state vs input)', () => {
  it('suppresses repeats: --a-a-b-b-a| emits a, b, a', () => {
    marble(({ cold, expectObservable }) => {
      // a@0, a@2, b@4, b@6, a@8 ; duplicates (frames 2 and 6) are suppressed
      const source$ = cold('a-a-b-b-a|', { a: 'a', b: 'b' });
      expectObservable(source$.pipe(distinctUntilChanged())).toBe(
        'a---b---a|',
        { a: 'a', b: 'b' },
      );
    });
  });
});

describe('Module 5 — take(2) is a finite automaton that terminates', () => {
  it('emits the first 2 values then completes early', () => {
    marble(({ cold, expectObservable }) => {
      // source would emit 5 values, but take(2) completes after the 2nd
      const source$ = cold('a-b-c-d-e|', {
        a: 1,
        b: 2,
        c: 3,
        d: 4,
        e: 5,
      });
      // b@2 is the 2nd value; take(2) emits it and completes at the same frame
      expectObservable(source$.pipe(take(2))).toBe('a-(b|)', { a: 1, b: 2 });
    });
  });

  it('on an infinite source, take(2) still terminates (reachable done state)', () => {
    marble(({ cold, expectObservable }) => {
      // never-completing source: a-b-c-d-...
      const infinite$ = cold('a-b-c-d-', { a: 1, b: 2, c: 3, d: 4 });
      expectObservable(infinite$.pipe(take(2))).toBe('a-(b|)', { a: 1, b: 2 });
    });
  });
});

describe('Module 5 — |Q| classification: termination behavior', () => {
  it('toArray (|Q| unbounded) emits ONCE, only on complete', () => {
    marble(({ cold, expectObservable }) => {
      const source$ = cold('--1--2--3|', { 1: 1, 2: 2, 3: 3 });
      expectObservable(source$.pipe(toArray())).toBe('---------(a|)', {
        a: [1, 2, 3],
      });
    });
  });

  it('toArray on an infinite source NEVER emits (no complete ever arrives)', () => {
    const frames = recordFrames(({ cold }) =>
      cold('a-b-c-d-', { a: 1, b: 2, c: 3, d: 4 }).pipe(toArray()),
    );
    // no complete => toArray never emits its buffer
    expect(frames).toStrictEqual([]);
  });

  it('map (|Q| = 1, stateless) is a pure function lifted over the stream', () => {
    marble(({ cold, expectObservable }) => {
      const source$ = cold('a-b-c|', { a: 1, b: 2, c: 3 });
      // no memory: each output depends on input alone
      expectObservable(source$.pipe(map((x) => x + 100))).toBe('a-b-c|', {
        a: 101,
        b: 102,
        c: 103,
      });
    });
  });
});
