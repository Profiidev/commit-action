import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';
import { runAction } from '../../src/main';
import { setupActionEnv, stubEvent, stubInputs } from '../helpers/action-env';
import { type Responder, startFakeApiServer } from '../helpers/fake-api-server';
import { type TestRepo, createRepo } from '../helpers/git-repo';

let server: Awaited<ReturnType<typeof startFakeApiServer>>;
let env: ReturnType<typeof setupActionEnv>;
let repo: TestRepo;

/** GitHub git data API and Forgejo contents API responses */
const api: Responder = ({ method, url }) => {
  if (url.includes('/git/ref/')) {
    return { body: { object: { sha: 'head-sha', type: 'commit' } } };
  }
  if (method === 'GET' && url.includes('/git/commits/')) {
    return { body: { tree: { sha: 'base-tree' } } };
  }
  if (url.endsWith('/git/blobs')) {
    return { body: { sha: 'blob-sha' }, status: 201 };
  }
  if (url.endsWith('/git/trees')) {
    return { body: { sha: 'new-tree' }, status: 201 };
  }
  if (url.endsWith('/git/commits')) {
    return { body: { sha: 'new-commit' }, status: 201 };
  }
  if (url.includes('/git/refs/')) {
    return { body: { object: { sha: 'new-commit' } } };
  }
  if (url.endsWith('/contents')) {
    return { body: { commit: { sha: 'forgejo-sha' } }, status: 201 };
  }
  return undefined;
};

const pushEvent = () => ({
  ref: 'refs/heads/main',
  repository: {
    clone_url: `file://${repo.remote}`,
    full_name: 'owner/repo'
  }
});

beforeAll(async () => {
  server = await startFakeApiServer(api);
});

afterAll(async () => server.close());

beforeEach(() => {
  server.requests.length = 0;
  env = setupActionEnv();
  repo = createRepo({ 'a.txt': 'a\n', 'b.txt': 'b\n' });
  process.chdir(repo.dir);
  vi.stubEnv('GITHUB_API_URL', server.url);
  stubInputs({
    add_paths: '',
    commit_message: 'chore: update',
    forgejo: 'false',
    git_user_email: 'bot@example.com',
    git_user_name: 'Bot',
    github_token: 'tok'
  });
  stubEvent(env.root, 'push', pushEvent());
});

afterEach(() => {
  env.restore();
  repo.cleanup();
});

describe('runAction', () => {
  it('reports no commit without changes', async () => {
    await runAction();
    expect(env.outputs()).toEqual({ committed: 'false', sha: '' });
    expect(server.requests.map((r) => r.method)).toEqual(['GET', 'GET']);
  });

  it('commits through the GitHub API', async () => {
    repo.write('a.txt', 'changed\n');
    await runAction();
    expect(env.outputs()).toEqual({ committed: 'true', sha: 'new-commit' });
    const commit = server.requests.find(
      (r) => r.method === 'POST' && r.url.endsWith('/git/commits')
    );
    expect(commit?.body.message).toBe('chore: update');
    expect(commit?.headers.authorization).toBe('token tok');
  });

  it('only commits add_paths', async () => {
    stubInputs({ add_paths: 'b.txt\n' });
    repo.write('a.txt', 'changed\n');
    await runAction();
    expect(env.outputs().committed).toBe('false');
    repo.write('b.txt', 'changed\n');
    await runAction();
    const tree = server.requests.find((r) => r.url.endsWith('/git/trees'));
    expect(tree?.body.tree.map((t: any) => t.path)).toEqual(['b.txt']);
  });

  it('commits through the Forgejo API', async () => {
    stubInputs({ forgejo: 'true' });
    repo.write('a.txt', 'changed\n');
    await runAction();
    expect(env.outputs()).toEqual({ committed: 'true', sha: 'forgejo-sha' });
    expect(server.requests).toHaveLength(1);
    const [request] = server.requests;
    expect(request.url).toBe('/repos/owner/repo/contents');
    expect(request.headers.authorization).toBe('Bearer tok');
    expect(request.body.author).toEqual({
      email: 'bot@example.com',
      name: 'Bot'
    });
    expect(request.body.message).toBe('chore: update');
  });

  it('fails on PRs from forks', async () => {
    stubEvent(env.root, 'pull_request', {
      pull_request: {
        head: {
          ref: 'feature',
          repo: {
            clone_url: 'https://example.com/fork/repo.git',
            full_name: 'fork/repo'
          }
        }
      },
      repository: pushEvent().repository
    });
    repo.write('a.txt', 'changed\n');
    await expect(runAction()).rejects.toThrow(/push to forks/);
    expect(server.requests).toEqual([]);
  });
});
