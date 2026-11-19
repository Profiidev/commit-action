import { git } from './utils/action';

/**
 * Stages all changes (limited to the given pathspecs, if any)
 * @param {string[]} paths - Git pathspecs to stage, all changes if empty
 */
export const stageChanges = (paths: string[]): void => {
  git(['add', '-A', '--', ...paths]);
};

/**
 * Stages changes and returns the paths of all staged files
 * @param {string[]} paths - Git pathspecs to stage, all changes if empty
 * @returns {string[]} - Staged file paths
 */
export const getChangedFiles = (paths: string[]): string[] => {
  stageChanges(paths);
  const changes = git(['diff', '--cached', '--name-only', '--no-renames']);
  return changes.stdout.split(/\r?\n/).filter((f) => f);
};
