/**
 * Module 7 — Subjects: the Fork in the Dataflow
 * Sections: Step 3 (unicast vs multicast), Step 4 (one execution → N pipelines),
 * Step 6 (the four variants), Step 8 (terminal states), Step 9 (asObservable).
 *
 * These are behavioral assertions (not marble timings) because the point is about
 * sharing, replay, and lifecycle rather than virtual-time scheduling.
 */
import { describe, it, expect } from 'vitest';
import {
  AsyncSubject,
  BehaviorSubject,
  Observable,
  ReplaySubject,
  Subject,
} from 'rxjs';

describe('Module 7 — unicast vs multicast', () => {
  it('cold Observable is unicast: the producer re-runs per subscriber (different values)', () => {
    let runs = 0;
    const cold$ = new Observable<number>((sub) => {
      runs += 1;
      sub.next(runs); // each subscription gets its own producer execution
      sub.complete();
    });

    const a: number[] = [];
    const b: number[] = [];
    cold$.subscribe((v) => a.push(v));
    cold$.subscribe((v) => b.push(v));

    expect(runs).toBe(2); // producer ran twice
    expect(a).toStrictEqual([1]);
    expect(b).toStrictEqual([2]); // different value — independent executions
  });

  it('Subject is multicast: one next() reaches all current subscribers with the same value', () => {
    const subject = new Subject<number>();
    const a: number[] = [];
    const b: number[] = [];
    subject.subscribe((v) => a.push(v));
    subject.subscribe((v) => b.push(v));

    subject.next(42);

    expect(a).toStrictEqual([42]);
    expect(b).toStrictEqual([42]); // same value to both
  });

  it('fork: one upstream execution feeds N downstream pipelines (producer runs once)', () => {
    let runs = 0;
    const source$ = new Observable<number>((sub) => {
      runs += 1;
      sub.next(10);
      sub.complete();
    });

    const subject = new Subject<number>();
    const doubled: number[] = [];
    const squared: number[] = [];
    subject.subscribe((v) => doubled.push(v * 2));
    subject.subscribe((v) => squared.push(v * v));

    source$.subscribe(subject); // ONE execution fans out to both pipelines

    expect(runs).toBe(1);
    expect(doubled).toStrictEqual([20]);
    expect(squared).toStrictEqual([100]);
  });
});

describe('Module 7 — the four variants differ in how much past they replay', () => {
  it('Subject: a late subscriber sees only future emissions (missed 1)', () => {
    const s = new Subject<number>();
    const seen: number[] = [];
    s.next(1); // nobody listening → lost
    s.subscribe((v) => seen.push(v));
    s.next(2);
    expect(seen).toStrictEqual([2]);
  });

  it('BehaviorSubject: exposes .value and replays the current value on subscribe', () => {
    const s = new BehaviorSubject<number>(0);
    expect(s.value).toBe(0); // synchronous read
    s.next(1);
    const seen: number[] = [];
    s.subscribe((v) => seen.push(v)); // gets current value 1 immediately
    s.next(2);
    expect(seen).toStrictEqual([1, 2]);
    expect(s.value).toBe(2);
  });

  it('ReplaySubject(2): a late subscriber gets the last 2 buffered values, then future', () => {
    const s = new ReplaySubject<number>(2);
    s.next(1);
    s.next(2);
    s.next(3);
    const seen: number[] = [];
    s.subscribe((v) => seen.push(v)); // replays 2, 3
    s.next(4);
    expect(seen).toStrictEqual([2, 3, 4]);
  });

  it('AsyncSubject: emits only the final value, and only on complete', () => {
    const s = new AsyncSubject<number>();
    const seen: number[] = [];
    s.next(1);
    s.next(2);
    s.next(3);
    s.subscribe((v) => seen.push(v));
    expect(seen).toStrictEqual([]); // nothing until complete
    s.complete();
    expect(seen).toStrictEqual([3]); // only the last value
  });
});

describe('Module 7 — error/complete are terminal one-way doors', () => {
  it('after complete: next() is a no-op and late subscribers get complete immediately', () => {
    const s = new Subject<number>();
    let aCompleted = false;
    let bCompleted = false;
    const aValues: number[] = [];

    s.subscribe({ next: (v) => aValues.push(v), complete: () => (aCompleted = true) });
    s.complete();
    s.next(99); // ignored — Subject is stopped

    s.subscribe({ complete: () => (bCompleted = true) }); // late subscriber

    expect(aCompleted).toBe(true);
    expect(aValues).toStrictEqual([]); // 99 never fanned out
    expect(bCompleted).toBe(true); // late subscriber gets complete immediately
  });

  it('after error: the stored error is delivered to late subscribers', () => {
    const s = new Subject<number>();
    const boom = new Error('boom');
    s.subscribe({ error: () => {} }); // first subscriber absorbs the error
    s.error(boom);

    let lateError: unknown = null;
    s.subscribe({ error: (e) => (lateError = e) });
    expect(lateError).toBe(boom);
  });
});

describe('Module 7 — asObservable() encapsulation', () => {
  it('consumers can subscribe but cannot push into a read-only state$', () => {
    class CounterStore {
      private readonly _state = new BehaviorSubject<number>(0);
      readonly state$ = this._state.asObservable();
      increment() {
        this._state.next(this._state.value + 1);
      }
    }

    const store = new CounterStore();
    const seen: number[] = [];
    store.state$.subscribe((v) => seen.push(v));
    store.increment();
    store.increment();

    expect(seen).toStrictEqual([0, 1, 2]);
    // the exposed Observable is NOT a Subject, so it has no next() to abuse
    expect((store.state$ as unknown as { next?: unknown }).next).toBeUndefined();
  });
});
