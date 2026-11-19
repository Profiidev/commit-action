import * as core from '@actions/core';
import { getOctokit } from '@actions/github';
import { client } from './forgejo-client/client.gen';
import { forgejoApiCommit } from './forgejo/api';
import { apiCommit } from './github/api';
import { getContext } from './github/context';

/**
 * Commits the changes in the workspace using the GitHub or Forgejo API
 */
export const runAction = async (): Promise<void> => {
  const context = getContext();
  const message = core.getInput('commit_message', { required: true });
  const gitName = core.getInput('git_user_name');
  const gitEmail = core.getInput('git_user_email');
  const forgejo = core.getInput('forgejo') === 'true';
  const apiUrl = core.getInput('api_url') || process.env.GITHUB_API_URL;
  const paths = core.getMultilineInput('add_paths');

  if (context.repository.hasFork) {
    throw new Error(
      'This action does not have permission to push to forks. You may want to run it only on `push` events.'
    );
  }

  let sha: string | undefined = undefined;
  if (forgejo) {
    if (apiUrl) {
      client.setConfig({
        baseUrl: apiUrl,
        headers: { Authorization: `Bearer ${context.token}` }
      });
    }
    sha = await forgejoApiCommit(context, message, gitEmail, gitName, paths);
  } else {
    const octokit = getOctokit(
      context.token,
      apiUrl ? { baseUrl: apiUrl } : {}
    );
    sha = await apiCommit(octokit, context, message, paths);
  }

  core.setOutput('committed', sha === undefined ? 'false' : 'true');
  core.setOutput('sha', sha ?? '');
};
