import { t } from '../electron/i18n/index.mjs';

function tokenValue(token) {
  return token[1] === undefined ? token[2] ?? token[3] : JSON.parse(token[0]);
}

export function parseWorkflowLaunch(input = '') {
  const tokens = /"((?:[^"\\]|\\.)*)"|'([^']*)'|([^\s"']\S*)|(["'])/g;
  const usage = () => Error(t('Use /workflow [path] [--plan] [--resume run-id] [--args JSON].'));
  let file = '', args, plan = false, resumeId;
  for (let token; (token = tokens.exec(input));) {
    const [, , , bare, unmatchedQuote] = token;
    if (unmatchedQuote) throw usage();
    if (bare === '--args') {
      args = JSON.parse(input.slice(tokens.lastIndex));
      if (!args || typeof args !== 'object' || Array.isArray(args)) {
        throw Error(t('--args must be a JSON object and the last option.'));
      }
      break;
    }
    if (bare === '--plan') {
      plan = true;
      continue;
    }
    if (bare === '--resume') {
      const next = tokens.exec(input);
      const id = next && !next[4] ? tokenValue(next) : undefined;
      if (!id || id.startsWith('--')) throw Error(t('Provide a run id after --resume.'));
      resumeId = id;
      continue;
    }
    if (file || bare?.startsWith('--')) throw usage();
    file = tokenValue(token);
  }
  return { file, args, plan, resumeId };
}
