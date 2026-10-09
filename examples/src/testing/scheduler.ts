import { TestScheduler } from 'rxjs/testing';

/**
 * Creates a fresh RxJS {@link TestScheduler} wired to a deep-equality assertion.
 *
 * The TestScheduler lets us run Observables in *virtual time*: marble diagrams
 * like `--a--b--|` are parsed into scheduled emissions, the whole pipeline is
 * "flushed" synchronously, and the recorded notifications are compared against
 * an expected marble diagram.
 *
 * This is exactly how the course's ASCII marble diagrams become *executable,
 * verifiable* claims rather than hand-drawn hypotheses.
 *
 * Usage:
 * ```ts
 * testScheduler().run(({ cold, expectObservable }) => {
 *   const source$ = cold('--a--b--|');
 *   expectObservable(source$.pipe(map(x => x + x))).toBe('--c--d--|', {
 *     c: 'aa', d: 'bb',
 *   });
 * });
 * ```
 */
export function testScheduler(): TestScheduler {
  return new TestScheduler((actual, expected) => {
    // `expect` is provided globally by Vitest (test.globals = true).
    expect(actual).toStrictEqual(expected);
  });
}

/**
 * Convenience wrapper: run a marble-testing callback inside a fresh scheduler.
 *
 * ```ts
 * marble(({ cold, expectObservable }) => { ... });
 * ```
 */
export function marble(
  callback: Parameters<TestScheduler['run']>[0],
): void {
  testScheduler().run(callback);
}

import type { Observable } from 'rxjs';

export interface Frame<T> {
  frame: number;
  value: T;
}

/**
 * Run an Observable in virtual time and return the exact `{ frame, value }` pairs
 * it emitted. Useful when marble-group timing semantics (e.g. simultaneous
 * emissions whose group width would misalign the diagram) make a `.toBe(...)`
 * string awkward — assert on the frames directly instead.
 */
export function recordFrames<T>(
  build: (helpers: Parameters<Parameters<TestScheduler['run']>[0]>[0]) => Observable<T>,
): Frame<T>[] {
  const ts = testScheduler();
  const frames: Frame<T>[] = [];
  ts.run((helpers) => {
    build(helpers).subscribe((value) => frames.push({ frame: ts.frame, value }));
  });
  return frames;
}
