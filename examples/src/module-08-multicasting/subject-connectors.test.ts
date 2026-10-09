/**
 * Module 8 — Multicasting = Subject + Lifecycle
 * Section: "Step 5: Behavior follows the Subject (demonstration)"
 *
 * The law: every multicast operator is backed by a Subject, and the choice of
 * Subject determines what a LATE subscriber sees. We prove it by holding the
 * mechanism constant and swapping ONLY the connector Subject.
 *
 * Two levels of demonstration:
 *
 *  1. Subject used DIRECTLY (this is the pure "behavior follows the Subject"
 *     claim, isolating replay semantics from any lifecycle policy). We push
 *     1,2,3 into the subject, then attach a late subscriber.
 *
 *  2. Via `connectable` with a *synchronous, completing* source. This exposes a
 *     subtlety the course's ⚠️ warnings point at: connectable's lifecycle layer
 *     (resetOnDisconnect) resets the connector once the source completes, so a
 *     late subscriber attaching AFTER completion does NOT see the replay buffer.
 *     The verified behavior is recorded here so the distinction is explicit.
 */
import { describe, it, expect } from 'vitest';
import {
  AsyncSubject,
  BehaviorSubject,
  ReplaySubject,
  Subject,
  connectable,
  of,
} from 'rxjs';

/**
 * Push 1,2,3 through a Subject used directly, then attach a late subscriber and
 * record what it receives. For replaying subjects we must emit BEFORE completing
 * so the late subscriber can observe the buffer / current value.
 */
function directLateSubscriberSees(subject: Subject<number>): number[] {
  const late: number[] = [];
  subject.next(1);
  subject.next(2);
  subject.next(3);
  subject.subscribe((v) => late.push(v)); // LATE: attaches after 1,2,3 were pushed
  return late;
}

describe('Module 8 — behavior follows the Subject (direct Subject usage)', () => {
  it('plain Subject: late subscriber sees nothing (missed 1,2,3)', () => {
    expect(directLateSubscriberSees(new Subject<number>())).toStrictEqual([]);
  });

  it('BehaviorSubject: late subscriber sees the current (last) value', () => {
    expect(
      directLateSubscriberSees(new BehaviorSubject<number>(0)),
    ).toStrictEqual([3]);
  });

  it('ReplaySubject(3): late subscriber gets 1,2,3 replayed', () => {
    expect(
      directLateSubscriberSees(new ReplaySubject<number>(3)),
    ).toStrictEqual([1, 2, 3]);
  });

  it('ReplaySubject(1): late subscriber gets only the last buffered value', () => {
    expect(
      directLateSubscriberSees(new ReplaySubject<number>(1)),
    ).toStrictEqual([3]);
  });

  it('AsyncSubject: late subscriber gets the final value, only after complete', () => {
    const subject = new AsyncSubject<number>();
    const late: number[] = [];
    subject.next(1);
    subject.next(2);
    subject.next(3);
    subject.subscribe((v) => late.push(v)); // attaches before complete...
    expect(late).toStrictEqual([]); // ...so sees nothing yet
    subject.complete(); // AsyncSubject emits its final value on complete
    expect(late).toStrictEqual([3]);
  });
});

/**
 * Multicast `of(1,2,3)` through connectable with a given connector, drive it with
 * connect(), THEN attach a late subscriber. of() is synchronous and completing, so
 * the whole thing runs during connect().
 */
function connectableLateSubscriberSees(
  connector: () => Subject<number>,
): number[] {
  const shared$ = connectable(of(1, 2, 3), { connector });
  const late: number[] = [];
  shared$.subscribe(() => {}); // an early subscriber
  shared$.connect(); // Subject subscribes to source; 1,2,3 flow and source completes
  shared$.subscribe((v) => late.push(v)); // LATE: attaches after completion
  return late;
}

describe('Module 8 — connectable lifecycle resets a completing synchronous source', () => {
  // With resetOnDisconnect (connectable default), the connector is torn down once
  // the source completes, so late subscribers do NOT inherit the replay buffer.
  it('Subject: late subscriber sees nothing', () => {
    expect(
      connectableLateSubscriberSees(() => new Subject<number>()),
    ).toStrictEqual([]);
  });

  it('ReplaySubject(3): late subscriber sees nothing (connector was reset)', () => {
    expect(
      connectableLateSubscriberSees(() => new ReplaySubject<number>(3)),
    ).toStrictEqual([]);
  });

  it('BehaviorSubject(0): late subscriber sees the fresh seed (connector was reset)', () => {
    // A brand-new BehaviorSubject(0) is created on reset, so the late subscriber
    // observes its seed value 0 rather than the completed stream's last value.
    expect(
      connectableLateSubscriberSees(() => new BehaviorSubject<number>(0)),
    ).toStrictEqual([0]);
  });

  it('AsyncSubject: late subscriber sees nothing (connector was reset)', () => {
    expect(
      connectableLateSubscriberSees(() => new AsyncSubject<number>()),
    ).toStrictEqual([]);
  });
});
