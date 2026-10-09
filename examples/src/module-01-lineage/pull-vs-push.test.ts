/**
 * Module 1 — Origins & Lineage
 * Verifies: the duality claim that pull (iterable) and push (observable) yield the
 * same sequence from the same generating idea; only the direction of control differs.
 */
import { describe, it, expect } from 'vitest';
import { runPull, runPush } from './pull-vs-push';

describe('Module 1 — pull/push duality', () => {
  it('the iterable (pull) produces squares 1..5', () => {
    expect(runPull(5)).toStrictEqual([1, 4, 9, 16, 25]);
  });

  it('the observable (push) produces the same squares 1..5', async () => {
    await expect(runPush(5)).resolves.toStrictEqual([1, 4, 9, 16, 25]);
  });

  it('pull and push yield the identical sequence (duality)', async () => {
    const pushed = await runPush(5);
    expect(pushed).toStrictEqual(runPull(5));
  });
});
