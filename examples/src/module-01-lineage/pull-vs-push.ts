/**
 * Module 1 — Origins & Lineage
 * Section: "Step 3: Rx.NET and the duality insight (push)"
 *
 * Erik Meijer's insight: an Observable is an Iterable with the arrows reversed.
 *   - Iterable (PULL): the consumer calls next() and pulls each value.
 *   - Observable (PUSH): the producer pushes each value at the consumer.
 *
 * The two snippets below produce the *same sequence* of values from the *same*
 * generating idea (squares of 1..5), differing only in who drives the data flow.
 *
 * Run it:
 *   npm run example src/module-01-lineage/pull-vs-push.ts
 */
import { range, map } from 'rxjs';

// --- PULL side: a generator / iterable. The consumer pulls. ---
function* squaresPull(n: number): Generator<number> {
  for (let x = 1; x <= n; x++) {
    yield x * x; // nothing is computed until the consumer asks (laziness)
  }
}

export function runPull(n: number): number[] {
  const out: number[] = [];
  for (const value of squaresPull(n)) {
    // the `for...of` loop is literally calling iterator.next() — PULLING
    out.push(value);
  }
  return out;
}

// --- PUSH side: an Observable. The producer pushes. ---
export function runPush(n: number): Promise<number[]> {
  return new Promise((resolve) => {
    const out: number[] = [];
    // range(1, n) is lazy exactly like the generator: nothing runs until subscribe.
    range(1, n)
      .pipe(map((x) => x * x))
      .subscribe({
        next: (value) => out.push(value), // the Observable PUSHES at us
        complete: () => resolve(out),
      });
  });
}

// Executed only when run directly via tsx, not when imported by the test.
if (import.meta.url === `file://${process.argv[1]}`) {
  const pulled = runPull(5);
  console.log('PULL (iterable):', pulled);
  runPush(5).then((pushed) => {
    console.log('PUSH (observable):', pushed);
    console.log('same sequence?', JSON.stringify(pulled) === JSON.stringify(pushed));
  });
}
