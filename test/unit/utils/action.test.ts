import { execFileSync } from 'node:child_process';
import * as core from '@actions/core';
import { describe, expect, it, vi } from 'vitest';
import { getEnv, git } from '../../../src/utils/action';

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn()
}));
vi.mock('@actions/core', () => ({ debug: vi.fn() }));

const execFile = vi.mocked(execFileSync);

describe('getEnv', () => {
  it('reads the uppercased variable', () => {
    vi.stubEnv('COMMIT_TEST_VAR', 'value');
    expect(getEnv('commit_test_var')).toBe('value');
  });

  it('returns undefined for a missing optional variable', () => {
    expect(getEnv('commit_test_missing')).toBeUndefined();
  });

  it('throws for a missing required variable', () => {
    expect(() => getEnv('commit_test_missing', true)).toThrow(
      'Environment variable "COMMIT_TEST_MISSING" is not defined'
    );
  });

  it('returns an empty string as is when required', () => {
    vi.stubEnv('COMMIT_TEST_EMPTY', '');
    expect(getEnv('commit_test_empty', true)).toBe('');
  });
});

describe('git', () => {
  it('runs git without a shell and trims stdout', () => {
    execFile.mockReturnValue(' abc \n');
    const args = ['commit', '-m', 'a "b" $(touch x) `id`'];
    expect(git(args)).toEqual({ status: 0, stderr: '', stdout: 'abc' });
    expect(execFile).toHaveBeenCalledWith('git', args, {
      cwd: undefined,
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024
    });
    expect(core.debug).toHaveBeenCalledWith(
      'git commit -m a "b" $(touch x) `id`'
    );
  });

  it('passes dir as cwd', () => {
    execFile.mockReturnValue('');
    git(['status'], { dir: '/repo' });
    expect(execFile.mock.calls[0][2]).toMatchObject({ cwd: '/repo' });
  });

  it('rethrows without ignoreErrors', () => {
    const error = Object.assign(new Error('fatal'), { status: 128 });
    execFile.mockImplementation(() => {
      throw error;
    });
    expect(() => git(['push'])).toThrow(error);
  });

  it('returns trimmed output with ignoreErrors', () => {
    execFile.mockImplementation(() => {
      throw Object.assign(new Error('diff'), {
        status: 1,
        stderr: ' e \n',
        stdout: Buffer.from(' o \n')
      });
    });
    expect(git(['diff'], { ignoreErrors: true })).toEqual({
      status: 1,
      stderr: 'e',
      stdout: 'o'
    });
  });
});
