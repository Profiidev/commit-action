# Commit Action

Commits workspace changes through the GitHub or Forgejo API, so commits are signed by the platform. Extracted from [rust-lint-action](https://github.com/Profiidev/rust-lint-action).

Supported events: `push`, `workflow_dispatch`, `pull_request` and `pull_request_target`. The commit goes to the branch of the event.

## Usage

```yaml
- uses: actions/checkout@v6
  with:
    # PRs: check out the head branch, not the merge commit
    ref: ${{ github.head_ref }}
- run: ./generate.sh
- uses: profiidev/commit-action@v1
  id: commit
  with:
    commit_message: 'chore: regenerate files'
    add_paths: |
      src/generated
      README.md
- run: echo "${{ steps.commit.outputs.sha }}"
  if: steps.commit.outputs.committed == 'true'
```

Forgejo:

```yaml
- uses: profiidev/commit-action@v1
  with:
    forgejo: true
    commit_message: 'chore: regenerate files'
    git_user_name: Bot
    git_user_email: bot@example.com
```

Pushing to forks is not possible, the action fails on PRs from forks.

## Inputs

| Input            | Default             | Description                                       |
| ---------------- | ------------------- | ------------------------------------------------- |
| `commit_message` |                     | Commit message (required)                         |
| `github_token`   | `github.token`      | Token for the GitHub or Forgejo API               |
| `add_paths`      |                     | Newline-separated pathspecs, all changes if empty |
| `forgejo`        | `false`             | Use the Forgejo API                               |
| `api_url`        | `GITHUB_API_URL`    | API URL                                           |
| `git_user_name`  | `GitHub Action`     | Commit author name (Forgejo only)                 |
| `git_user_email` | `action@github.com` | Commit author email (Forgejo only)                |

## Outputs

- `committed`: `true` if a commit was created
- `sha`: SHA of the created commit
