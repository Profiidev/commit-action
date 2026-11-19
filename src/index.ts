import * as core from '@actions/core';
import { runAction } from './main';

// oxlint-disable-next-line use-unknown-in-catch-callback-variable
runAction().catch((error: any) => {
  core.debug(error.stack || 'No error stack trace');
  core.setFailed(error.message);
});
