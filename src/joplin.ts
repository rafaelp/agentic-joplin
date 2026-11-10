import { spawn } from 'node:child_process';
import { closeSync, openSync, readSync, statSync } from 'node:fs';
import { config } from './config.ts';

export type RunResult = {
  code: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  lines: string[];
};

const KEEP_LINES = 200;
const KILL_GRACE_MS = 30_000;

// Runs `joplin <args>`. On timeout it sends SIGTERM and, if the process does not exit, SIGKILL.
export function runJoplin(args: string[], timeoutMs: number): Promise<RunResult> {
  const profile = config.joplinProfileArg ? ['--profile', config.joplinProfileArg] : [];
  return new Promise((resolve, reject) => {
    const child = spawn(config.joplinBin, [...profile, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    const lines: string[] = [];
    let timedOut = false;
    let killTimer: NodeJS.Timeout | undefined;

    const collect = (chunk: Buffer) => {
      for (const line of chunk.toString().split(/\r?\n/)) {
        if (!line.trim()) continue;
        lines.push(line);
        if (lines.length > KEEP_LINES) lines.shift();
      }
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      killTimer = setTimeout(() => child.kill('SIGKILL'), KILL_GRACE_MS);
    }, timeoutMs);

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      clearTimeout(killTimer);
      resolve({ code, signal, timedOut, lines });
    });
  });
}

// `joplin sync` exits 0 when its own lock is held by another process; the message names the
// synclock_ file in every locale.
export const isJoplinLockHeld = (r: RunResult) => r.lines.some((l) => l.includes('synclock_'));

// Item errors during a sync do not change the exit code. The CLI prints them as a translated
// "Last error: …" line and logs an untranslated "There was some errors" warning to log.txt.
export function itemSyncError(r: RunResult, joplinLogSince: string): string | null {
  const lastError = r.lines.findLast((l) => /^Last error:/.test(l));
  if (lastError) return lastError.replace(/^Last error:\s*/, '');
  const logLines = joplinLogSince.split('\n');
  const marker = logLines.findLastIndex((l) => l.includes('There was some errors'));
  if (marker === -1) return null;
  // The warning is followed by one line per error.
  return logLines[marker + 1]?.trim() || 'Joplin reported item errors (see log.txt)';
}

export const fileSize = (file: string) => {
  try {
    return statSync(file).size;
  } catch {
    return 0;
  }
};

// Reads what was appended to a file after `offset`, capped at the last `maxBytes`.
export function readSince(file: string, offset: number, maxBytes = 512 * 1024): string {
  const size = fileSize(file);
  if (size <= offset) return '';
  const start = Math.max(offset, size - maxBytes);
  const buffer = Buffer.alloc(size - start);
  const fd = openSync(file, 'r');
  try {
    readSync(fd, buffer, 0, buffer.length, start);
  } finally {
    closeSync(fd);
  }
  return buffer.toString('utf8');
}
