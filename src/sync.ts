import { config } from './config.ts';
import { fileSize, isJoplinLockHeld, itemSyncError, readSince, runJoplin, type RunResult } from './joplin.ts';
import { acquireLock } from './lock.ts';
import { log, rotate } from './log.ts';
import { notify } from './notify.ts';
import { loadState, saveState, type State } from './state.ts';

const TITLE = 'Joplin sync';

function rotateLogs() {
  rotate(config.syncLog, config.logMaxBytes, config.logKeep);
  rotate(config.launchdLog, config.logMaxBytes, config.logKeep);
  if (rotate(config.joplinLog, config.joplinLogMaxBytes, config.joplinLogKeep)) log(`rotated ${config.joplinLog}`);
}

const tail = (result: RunResult, n: number) => result.lines.slice(-n).join(' | ');
const duration = (ms: number) => (ms >= 60_000 ? `${Math.round(ms / 60_000)} min` : `${Math.round(ms / 1000)}s`);

function failure(step: string, result: RunResult, timeoutMs: number): string | null {
  if (result.timedOut) return `${step} ran longer than ${duration(timeoutMs)} and was killed`;
  if (result.code !== 0) return `${step} exited with ${result.code ?? result.signal}: ${tail(result, 2)}`;
  return null;
}

function recordFailure(state: State, message: string) {
  state.consecutiveFailures++;
  state.consecutiveSkips = 0;
  state.lastError = message;
  log(`ERROR (${state.consecutiveFailures} in a row): ${message}`);
  if (state.consecutiveFailures === 1 || state.consecutiveFailures % config.renotifyEvery === 0) {
    const suffix = state.consecutiveFailures > 1 ? ` (${state.consecutiveFailures}× in a row)` : '';
    notify(`${TITLE} failed${suffix}`, message);
  }
}

function recordSkip(state: State, reason: string) {
  state.consecutiveSkips++;
  log(`skipped (${state.consecutiveSkips} in a row): ${reason}`);
  if (state.consecutiveSkips === config.skipsBeforeNotify) {
    const minutes = Math.round((config.skipsBeforeNotify * config.intervalSeconds) / 60);
    notify(`${TITLE} stalled`, `No sync for ${minutes} min: ${reason}`);
  }
}

function recordSuccess(state: State, startedAt: number) {
  if (state.consecutiveFailures > 0) notify(`${TITLE} recovered`, `Synced after ${state.consecutiveFailures} failed run(s).`);
  state.consecutiveFailures = 0;
  state.consecutiveSkips = 0;
  state.lastSuccess = new Date().toISOString();
  delete state.lastError;
  log(`ok in ${duration(Date.now() - startedAt)}`);
}

async function main() {
  const lock = acquireLock();
  if (!('release' in lock)) {
    // No state update: the run holding the lock owns the state file right now.
    log(`skipped: previous run still in progress (pid ${lock.heldBy})`);
    return;
  }

  const state = loadState();
  const startedAt = Date.now();
  state.lastRun = new Date(startedAt).toISOString();

  try {
    rotateLogs();
    log('sync started');

    const joplinLogOffset = fileSize(config.joplinLog);
    const sync = await runJoplin(['sync'], config.syncTimeoutMs);
    if (isJoplinLockHeld(sync)) return recordSkip(state, "Joplin's sync lock is held by another joplin process");
    const syncError = failure('sync', sync, config.syncTimeoutMs) ?? itemSyncError(sync, readSince(config.joplinLog, joplinLogOffset));
    if (syncError) return recordFailure(state, syncError);
    log(`sync: ${sync.lines.findLast((l) => l.includes('Fetched items')) ?? tail(sync, 1)}`);

    const decrypt = await runJoplin(['e2ee', 'decrypt'], config.decryptTimeoutMs);
    const decryptError = failure('e2ee decrypt', decrypt, config.decryptTimeoutMs);
    if (decryptError) return recordFailure(state, decryptError);
    log(`decrypt: ${tail(decrypt, 2)}`);

    recordSuccess(state, startedAt);
  } catch (error) {
    recordFailure(state, (error as Error).message);
  } finally {
    saveState(state);
    lock.release();
  }
}

await main();
