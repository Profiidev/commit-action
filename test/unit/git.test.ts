import { describe, expect, it, vi } from 'vitest';
import { getChangedFiles, stageChanges } from '../../src/git';
import { git } from '../../src/utils/action';

vi.mock('../../src/utils/action', () => ({ git: vi.fn() }));

const mockGit = vi.mocked(git);
const out = (stdout: string, status = 0) => ({ status, stderr: '', stdout });
const commands = () => mockGit.mock.calls.map((c) => c[0]);

describe('stageChanges', () => {
  it('stages everything without paths', () => {
    stageChanges([]);
    expect(commands()).toEqual([['add', '-A', '--']]);
  });

  it('passes paths as single pathspec arguments', () => {
    stageChanges(['src', 'a b.txt', '$(id)']);
    expect(commands()).toEqual([
      ['add', '-A', '--', 'src', 'a b.txt', '$(id)']
    ]);
  });
});

describe('getChangedFiles', () => {
  it('stages and splits the names', () => {
    mockGit
      .mockReturnValueOnce(out(''))
      .mockReturnValueOnce(out('a.rs\r\nb/c.rs\n\nd.rs'));
    expect(getChangedFiles(['src'])).toEqual(['a.rs', 'b/c.rs', 'd.rs']);
    expect(commands()).toEqual([
      ['add', '-A', '--', 'src'],
      ['diff', '--cached', '--name-only', '--no-renames']
    ]);
  });

  it('returns an empty list without changes', () => {
    mockGit.mockReturnValue(out(''));
    expect(getChangedFiles([])).toEqual([]);
  });
});
