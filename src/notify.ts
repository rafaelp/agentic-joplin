import { execFileSync } from 'node:child_process';
import { config } from './config.ts';
import { log } from './log.ts';

// Native macOS notification through osascript. Text goes in argv, so no AppleScript escaping is needed.
export function notify(title: string, message: string) {
  log(`notify: ${title} — ${message}`);
  if (!config.notify) return;
  try {
    execFileSync('/usr/bin/osascript', [
      '-e', 'on run argv',
      '-e', 'display notification (item 2 of argv) with title (item 1 of argv) sound name "Basso"',
      '-e', 'end run',
      title, message.slice(0, 240),
    ]);
  } catch (error) {
    log(`notification failed: ${(error as Error).message}`);
  }
}
