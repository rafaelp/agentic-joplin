import { appendFileSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from './config.ts';

// Size-based rotation: file → file.1 → … → file.<keep>; the oldest one is overwritten.
export function rotate(file: string, maxBytes: number, keep: number): boolean {
  let size: number;
  try {
    size = statSync(file).size;
  } catch {
    return false;
  }
  if (size < maxBytes) return false;

  for (let i = keep - 1; i >= 1; i--) {
    try {
      renameSync(`${file}.${i}`, `${file}.${i + 1}`);
    } catch {}
  }
  renameSync(file, `${file}.1`);
  return true;
}

export function log(message: string) {
  const line = `${new Date().toISOString()} [${process.pid}] ${message}\n`;
  mkdirSync(dirname(config.syncLog), { recursive: true });
  appendFileSync(config.syncLog, line);
  if (process.stdout.isTTY) process.stdout.write(line);
}
