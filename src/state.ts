import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from './config.ts';

export type State = {
  consecutiveFailures: number;
  consecutiveSkips: number;
  lastRun?: string;
  lastSuccess?: string;
  lastError?: string;
};

export function loadState(): State {
  try {
    return { consecutiveFailures: 0, consecutiveSkips: 0, ...JSON.parse(readFileSync(config.stateFile, 'utf8')) };
  } catch {
    return { consecutiveFailures: 0, consecutiveSkips: 0 };
  }
}

export function saveState(state: State) {
  mkdirSync(dirname(config.stateFile), { recursive: true });
  writeFileSync(config.stateFile, `${JSON.stringify(state, null, 2)}\n`);
}
