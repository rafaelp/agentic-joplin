#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { buildPlist, followLogs, install, kickstart, status, uninstall } from './agent.ts';
import { runSync } from './sync.ts';

// package.json sits one level up both from src/ (checkout) and from dist/ (npm install).
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };

const usage = `agentic-joplin ${version}: keep the Joplin CLI in sync on macOS

Usage: agentic-joplin <command>

Commands:
  sync        Run one sync now, in the foreground
  install     Install and start the launchd agent (runs "sync" every AJ_INTERVAL_MIN minutes)
  uninstall   Unload the agent and delete its plist
  status      Show whether the agent is loaded, plus the last run, success and error
  run         Ask launchd to start a run now
  logs        Follow the sync log
  print       Print the plist that "install" would write
  help        Show this help
  version     Show the version

Settings are AJ_* environment variables; see https://github.com/rafaelp/agentic-joplin#configuration`;

const commands: Record<string, () => unknown> = {
  sync: runSync,
  install,
  uninstall,
  status,
  run: kickstart,
  logs: followLogs,
  print: () => process.stdout.write(buildPlist()),
  help: () => console.log(usage),
  version: () => console.log(version),
};

const name = process.argv[2] ?? 'help';
const command = commands[name] ?? { '-h': commands.help, '--help': commands.help, '-v': commands.version, '--version': commands.version }[name];

if (!command) {
  console.error(`unknown command: ${name}\n\n${usage}`);
  process.exit(1);
}
try {
  await command();
} catch (error) {
  console.error(`agentic-joplin: ${(error as Error).message}`);
  process.exit(1);
}
