/**
 * Module 3 — The Operator Algebra
 * Section: "Step 6: The four flattening operators (Monad bind)"
 *
 * The four operators differ in exactly ONE dimension: their transition rule when a
 * new outer value arrives while an inner Observable is still running. We verify each
 * one's distinguishing behavior with overlapping inner timings.
 *
 * Setup for the overlap tests:
 *   outer:    a----b          (b arrives WHILE a's inner is still emitting)
 *   inner(x): x-x-x|          (3 emissions over time, then complete)
 */
import { describe, it, expect } from 'vitest';
import { concatMap, exhaustMap, mergeMap, switchMap } from 'rxjs';
import { marble, recordFrames } from '../testing/scheduler';

describe('Module 3 — flattening operators (Monad bind)', () => {
  it('mergeMap: union — subscribe to every inner, interleave outputs', () => {
    // Simultaneous emissions from overlapping inners make a `.toBe(...)` marble
    // string awkward (marble group widths misalign the diagram), so we assert on
    // the exact { frame, value } pairs instead.
    const frames = recordFrames(({ cold }) => {
      const outer$ = cold('a-b|', { a: 'a', b: 'b' }); // a@0, b@2
      const inner = (x: string) => cold('x-x-x|', { x }); // 3 emissions, then complete
      return outer$.pipe(mergeMap(inner));
    });

    // a's inner emits at 0,2,4; b's inner (from frame 2) at 2,4,6 — interleaved.
    expect(frames).toStrictEqual([
      { frame: 0, value: 'a' },
      { frame: 2, value: 'a' },
      { frame: 2, value: 'b' },
      { frame: 4, value: 'a' },
      { frame: 4, value: 'b' },
      { frame: 6, value: 'b' },
    ]);
  });

  it('concatMap: sequential — next inner waits for the previous to complete', () => {
    marble(({ cold, expectObservable }) => {
      const outer$ = cold('a-b|', { a: 'a', b: 'b' });
      const inner = (x: string) => cold('x-x-x|', { x });

      // a's inner emits at 0,2,4 and completes at frame 5; b's inner then starts at
      // frame 5, emitting at 5,7,9 and completing at 10.
      expectObservable(outer$.pipe(concatMap(inner))).toBe(
        'a-a-ab-b-b|',
        { a: 'a', b: 'b' },
      );
    });
  });

  it('switchMap: latest wins — a new outer cancels the running inner', () => {
    marble(({ cold, expectObservable }) => {
      const outer$ = cold('a-b|', { a: 'a', b: 'b' });
      const inner = (x: string) => cold('x-x-x|', { x });

      // a emits at 0; at frame 2 b arrives and CANCELS a's inner (a's 2nd/3rd dropped),
      // then b's inner runs its full 3 emissions.
      expectObservable(outer$.pipe(switchMap(inner))).toBe(
        'a-b-b-b|',
        { a: 'a', b: 'b' },
      );
    });
  });

  it('exhaustMap: first wins — new outer values are ignored while an inner runs', () => {
    marble(({ cold, expectObservable }) => {
      const outer$ = cold('a-b|', { a: 'a', b: 'b' });
      const inner = (x: string) => cold('x-x-x|', { x });

      // a's inner is busy (frames 0..5) when b arrives at frame 2, so b is DROPPED.
      expectObservable(outer$.pipe(exhaustMap(inner))).toBe(
        'a-a-a|',
        { a: 'a' },
      );
    });
  });

  it('equivalence: mergeMap(f, 1) ≡ concatMap(f) (concurrency 1 = sequential)', () => {
    marble(({ cold, expectObservable }) => {
      const outer$ = cold('a-b|', { a: 'a', b: 'b' });
      const inner = (x: string) => cold('x-x-x|', { x });

      const expected = 'a-a-ab-b-b|';
      const values = { a: 'a', b: 'b' };

      expectObservable(outer$.pipe(mergeMap(inner, 1))).toBe(expected, values);
      expectObservable(outer$.pipe(concatMap(inner))).toBe(expected, values);
    });
  });
});
