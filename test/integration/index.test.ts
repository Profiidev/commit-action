import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupActionEnv } from '../helpers/action-env';

// Hoisted so every fresh import of the mocked module after resetModules shares the same spy
const { runAction } = vi.hoisted(() => ({
  runAction: vi.fn(async () => undefined)
}));
vi.mock('../../src/main', () => ({ runAction }));

let env: ReturnType<typeof setupActionEnv>;

beforeEach(() => {
  env = setupActionEnv();
  vi.resetModules();
});

afterEach(() => env.restore());

/** Imports the entry point fresh, so its top-level call runs again, and lets it settle */
const runIndex = async () => {
  await import('../../src/index');
  await new Promise((resolve) => {
    setImmediate(resolve);
  });
};

describe('index', () => {
  it('runs the action', async () => {
    await runIndex();
    expect(runAction).toHaveBeenCalledOnce();
    expect(process.exitCode).toBeUndefined();
  });

  it('fails the action and logs the stack when it rejects', async () => {
    const error = new Error('boom');
    vi.mocked(runAction).mockRejectedValueOnce(error);
    await runIndex();
    expect(process.exitCode).toBe(1);
    expect(env.commands('error')).toEqual(['boom']);
    expect(env.commands('debug')).toEqual([
      error.stack?.replaceAll('\n', '%0A')
    ]);
  });

  it('logs a placeholder for errors without a stack', async () => {
    vi.mocked(runAction).mockRejectedValueOnce({ message: 'no stack' });
    await runIndex();
    expect(process.exitCode).toBe(1);
    expect(env.commands('error')).toEqual(['no stack']);
    expect(env.commands('debug')).toEqual(['No error stack trace']);
  });
});
