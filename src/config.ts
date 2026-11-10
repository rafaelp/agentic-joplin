import { homedir } from 'node:os';
import { join } from 'node:path';

// Every setting can be overridden with an environment variable. `npm run agent:install` copies the
// ones that are set into the LaunchAgent, so they also apply to the scheduled runs.
export const ENV_KEYS = [
  'AJ_LABEL',
  'AJ_INTERVAL_MIN',
  'AJ_SYNC_TIMEOUT_MIN',
  'AJ_DECRYPT_TIMEOUT_MIN',
  'AJ_LOG_MAX_MB',
  'AJ_LOG_KEEP',
  'AJ_JOPLIN_LOG_MAX_MB',
  'AJ_JOPLIN_LOG_KEEP',
  'AJ_RENOTIFY_EVERY',
  'AJ_SKIPS_BEFORE_NOTIFY',
  'AJ_NOTIFY',
  'JOPLIN_PROFILE',
] as const;

const env = process.env;
const num = (name: string, fallback: number) => {
  const value = Number(env[name] ?? fallback);
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be a non-negative number`);
  return value;
};
const int = (name: string, fallback: number) => Math.max(1, Math.round(num(name, fallback)));

const home = homedir();
const label = env.AJ_LABEL ?? 'agentic-joplin';
const logDir = join(home, 'Library/Logs', label);
const stateDir = join(home, 'Library/Application Support', label);
const joplinProfile = env.JOPLIN_PROFILE ?? join(home, '.config/joplin');
const MB = 1024 * 1024;

export const config = {
  label,
  joplinBin: env.JOPLIN_BIN ?? 'joplin',
  // Only passed to joplin when set explicitly, so the CLI keeps resolving its own default.
  joplinProfileArg: env.JOPLIN_PROFILE,
  intervalSeconds: int('AJ_INTERVAL_MIN', 15) * 60,

  // A sync that runs longer than this is killed and counted as a failure. A first full sync
  // with a few GB of attachments can take well over an hour, hence the generous default.
  syncTimeoutMs: num('AJ_SYNC_TIMEOUT_MIN', 90) * 60_000,
  decryptTimeoutMs: num('AJ_DECRYPT_TIMEOUT_MIN', 15) * 60_000,

  logDir,
  syncLog: join(logDir, 'sync.log'),
  launchdLog: join(logDir, 'launchd.log'),
  logMaxBytes: num('AJ_LOG_MAX_MB', 1) * MB,
  logKeep: int('AJ_LOG_KEEP', 5),
  // The CLI only rotates log.txt in interactive mode, so one-shot `joplin sync` runs grow it forever.
  joplinLog: join(joplinProfile, 'log.txt'),
  joplinLogMaxBytes: num('AJ_JOPLIN_LOG_MAX_MB', 10) * MB,
  joplinLogKeep: int('AJ_JOPLIN_LOG_KEEP', 3),

  stateDir,
  lockFile: join(stateDir, 'sync.lock'),
  stateFile: join(stateDir, 'state.json'),

  notify: env.AJ_NOTIFY !== '0',
  // Consecutive failures: notify on the first one, then every N runs (4 × 15 min = 1 h).
  renotifyEvery: int('AJ_RENOTIFY_EVERY', 4),
  // Consecutive skipped runs (Joplin's lock held by another process) before notifying: 8 × 15 min = 2 h.
  skipsBeforeNotify: int('AJ_SKIPS_BEFORE_NOTIFY', 8),
};
