import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from './config.ts';

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

function readOwner(): number | null {
  try {
    const pid = Number(readFileSync(config.lockFile, 'utf8').trim());
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

export type Lock = { release: () => void };

// File lock holding the owner's PID. If the owner is gone (killed, crashed, reboot) the lock is
// stale and gets taken over; if it is alive, its PID is returned so the caller can skip this run.
export function acquireLock(): Lock | { heldBy: number } {
  mkdirSync(dirname(config.lockFile), { recursive: true });

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      writeFileSync(config.lockFile, String(process.pid), { flag: 'wx' });
      return {
        release: () => {
          if (readOwner() === process.pid) unlinkSync(config.lockFile);
        },
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const owner = readOwner();
      if (owner !== null && isAlive(owner)) return { heldBy: owner };
      try {
        unlinkSync(config.lockFile);
      } catch {}
    }
  }
  throw new Error(`could not create lock file ${config.lockFile}`);
}
