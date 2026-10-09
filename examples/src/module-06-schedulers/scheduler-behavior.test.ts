/**
 * Module 6 — Schedulers as the Clock
 * Sections: Step 5 (deterministic concurrency), Step 8 (where schedulers plug in),
 * Step 9 (virtual-time payoff)
 *
 * We verify:
 *  - mergeMap's second argument is a concurrency semaphore (bounded active inners).
 *  - mergeMap(f, 1) ≡ concatMap(f) (concurrency 1 = sequential) — the ⚠️ claim.
 *  - queueScheduler emits synchronously, in order.
 *  - asapScheduler defers work off the current synchronous stack (microtask).
 */
import { describe, it, expect } from 'vitest';
import {
  asapScheduler,
  concatMap,
  mergeMap,
  of,
  queueScheduler,
} from 'rxjs';
import { recordFrames } from '../testing/scheduler';

describe('Module 6 — mergeMap concurrency is a semaphore on active inners', () => {
  it('mergeMap(inner, 2): at most 2 inners active; the 3rd waits for a slot', () => {
    const frames = recordFrames(({ cold }) => {
      const outer$ = cold('abc|', { a: 'a', b: 'b', c: 'c' }); // a@0, b@1, c@2
      const inner = (x: string) => cold('x--x|', { x }); // emits at 0 and 3, completes at 4
      return outer$.pipe(mergeMap(inner, 2));
    });

    // a and b start immediately (slots full); c is queued until a's inner completes
    // (frame 3), then c runs frames 4 and 7.
    expect(frames).toStrictEqual([
      { frame: 0, value: 'a' },
      { frame: 1, value: 'b' },
      { frame: 3, value: 'a' },
      { frame: 4, value: 'b' },
      { frame: 4, value: 'c' },
      { frame: 7, value: 'c' },
    ]);
  });

  it('mergeMap(inner, 1) ≡ concatMap(inner) — concurrency 1 is sequential', () => {
    const viaMergeMap1 = recordFrames(({ cold }) => {
      const outer$ = cold('a-b|', { a: 'a', b: 'b' });
      const inner = (x: string) => cold('x-x-x|', { x });
      return outer$.pipe(mergeMap(inner, 1));
    });

    const viaConcatMap = recordFrames(({ cold }) => {
      const outer$ = cold('a-b|', { a: 'a', b: 'b' });
      const inner = (x: string) => cold('x-x-x|', { x });
      return outer$.pipe(concatMap(inner));
    });

    expect(viaMergeMap1).toStrictEqual(viaConcatMap);
  });
});

describe('Module 6 — execution context differs by scheduler', () => {
  it('queueScheduler: of(...) emits synchronously, in order, on the current stack', () => {
    const out: number[] = [];
    of(1, 2, 3, queueScheduler).subscribe((v) => out.push(v));
    // already fully populated before the next line runs — proves synchronous delivery
    expect(out).toStrictEqual([1, 2, 3]);
  });

  it('asapScheduler: delivery is deferred off the current synchronous stack', async () => {
    const order: string[] = [];
    of('async-value', asapScheduler).subscribe((v) => order.push(v));
    order.push('sync-after-subscribe');

    // synchronously, the subscribe callback has NOT run yet
    expect(order).toStrictEqual(['sync-after-subscribe']);

    // after a microtask turn, the asap work has run
    await Promise.resolve();
    expect(order).toStrictEqual(['sync-after-subscribe', 'async-value']);
  });
});
