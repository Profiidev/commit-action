import { rmSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getChangedFiles } from '../../src/git';
import { setupActionEnv } from '../helpers/action-env';
import { type TestRepo, createRepo } from '../helpers/git-repo';

let env: ReturnType<typeof setupActionEnv>;
let repo: TestRepo;

beforeEach(() => {
  env = setupActionEnv();
  repo = createRepo({ 'a.txt': 'a\n', 'b.txt': 'b\n', 'c.txt': 'c\n' });
  process.chdir(repo.dir);
});

afterEach(() => {
  env.restore();
  repo.cleanup();
});

describe('getChangedFiles', () => {
  it('stages everything and lists paths without renames', () => {
    repo.write('a.txt', 'changed\n');
    repo.write('new.txt', 'new\n');
    rmSync(path.join(repo.dir, 'b.txt'));
    repo.git('mv c.txt moved.txt');
    expect(getChangedFiles([]).toSorted()).toEqual([
      'a.txt',
      'b.txt',
      'c.txt',
      'moved.txt',
      'new.txt'
    ]);
    expect(repo.git('status --porcelain')).not.toMatch(/^\?\?/m);
  });

  it('only stages the given paths', () => {
    repo.write('a.txt', 'changed\n');
    repo.write('sub/new.txt', 'new\n');
    repo.write('other.txt', 'other\n');
    expect(getChangedFiles(['a.txt', 'sub']).toSorted()).toEqual([
      'a.txt',
      'sub/new.txt'
    ]);
    expect(repo.git('status --porcelain')).toMatch(/^\?\? other\.txt$/m);
  });

  it('returns an empty list on a clean tree', () => {
    expect(getChangedFiles([])).toEqual([]);
  });
});
