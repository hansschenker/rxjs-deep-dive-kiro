/**
 * Module 4 — Time Algebra
 * Sections: "Step 4: SHIFT", "Step 5: SAMPLE", "Step 8: Time algebra laws"
 *
 * Verifies the time-axis laws and sampling behaviors in virtual time:
 *   SHIFT additivity:   delay(a) then delay(b)        ≡  delay(a + b)
 *   SHIFT distributes:  delay(d)(merge(x, y))          ≡  merge(delay(d)(x), delay(d)(y))
 *   SAMPLE debounceTime: "wait for silence" — emits the last value before a gap
 *   SAMPLE throttleTime: "leading edge rate limit" — emits the first of each window
 *
 * Marble timing notes: in TestScheduler marbles, one character = 1 frame, and a
 * number like `20ms` denotes a 20-frame gap. delay/debounce/throttle default to the
 * TestScheduler's virtual asyncScheduler inside .run(), so timings are deterministic.
 */
import { describe, it } from 'vitest';
import { debounceTime, delay, merge, throttleTime } from 'rxjs';
import { marble } from '../testing/scheduler';

describe('Module 4 — SHIFT (delay) laws', () => {
  it('delay(d) shifts every emission (and completion) right by d', () => {
    marble(({ cold, expectObservable }) => {
      const source$ = cold('--a--b--c|', { a: 1, b: 2, c: 3 });
      // shift right by 2 frames. actual frames: 1@4, 2@7, 3@10, complete@10
      expectObservable(source$.pipe(delay(2))).toBe('----a--b--(c|)', {
        a: 1,
        b: 2,
        c: 3,
      });
    });
  });

  it('Additivity: delay(a) then delay(b) ≡ delay(a + b)', () => {
    marble(({ cold, expectObservable }) => {
      const source$ = cold('a--b|', { a: 1, b: 2 });
      const twoShifts$ = source$.pipe(delay(2), delay(3));
      const oneShift$ = source$.pipe(delay(5));

      // actual frames for both forms: 1@5, 2@8, complete@8
      const expected = '-----a--(b|)';
      const values = { a: 1, b: 2 };

      expectObservable(twoShifts$).toBe(expected, values);
      expectObservable(oneShift$).toBe(expected, values);
    });
  });

  it('Distributivity: delay(d)(merge(x,y)) ≡ merge(delay(d)(x), delay(d)(y))', () => {
    marble(({ cold, expectObservable }) => {
      const x$ = cold('x---x|', { x: 'x' });
      const y$ = cold('-y---y|', { y: 'y' });

      const delayOutside$ = merge(x$, y$).pipe(delay(3));
      const delayInside$ = merge(x$.pipe(delay(3)), y$.pipe(delay(3)));

      // both forms produce identical frames: x@3, y@4, x@7, y@8, complete@8
      const expected = '---xy--x(y|)';
      const values = { x: 'x', y: 'y' };

      expectObservable(delayOutside$).toBe(expected, values);
      expectObservable(delayInside$).toBe(expected, values);
    });
  });
});

describe('Module 4 — SAMPLE strategies', () => {
  it('debounceTime: "wait for silence" — emits the last value before each gap', () => {
    marble(({ cold, expectObservable }) => {
      //  burst a-b-c, a gap, then d. debounce(3) emits a value only once the
      //  source has been quiet for 3 frames.
      const source$ = cold('a-b-c------d|', {
        a: 'a',
        b: 'b',
        c: 'c',
        d: 'd',
      });
      // c settles 3 frames after it arrives (c@4 -> emit at 7); d is last before
      // completion and is flushed with the complete. actual: c@7, d@12, complete@12
      expectObservable(source$.pipe(debounceTime(3))).toBe(
        '-------c----(d|)',
        { c: 'c', d: 'd' },
      );
    });
  });

  it('throttleTime: "leading edge" — emits the first of each window, mutes for t', () => {
    marble(({ cold, expectObservable }) => {
      const source$ = cold('a-b-c-d-e-f|', {
        a: 'a',
        b: 'b',
        c: 'c',
        d: 'd',
        e: 'e',
        f: 'f',
      });
      // leading-edge default: emit a@0, mute for 4 frames, then the first value
      // after the window (d@6) is emitted, mute again. actual: a@0, d@6, complete@11
      expectObservable(source$.pipe(throttleTime(4))).toBe('a-----d----|', {
        a: 'a',
        d: 'd',
      });
    });
  });
});
