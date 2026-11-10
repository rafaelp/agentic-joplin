import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir, userInfo } from 'node:os';
import { dirname, extname, join } from 'node:path';
import { config, ENV_KEYS } from './config.ts';
import { loadState } from './state.ts';

const plistPath = join(homedir(), 'Library/LaunchAgents', `${config.label}.plist`);
const domain = `gui/${userInfo().uid}`;
const service = `${domain}/${config.label}`;

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// The agent runs the node binary that ran this command, by absolute path, so switching the
// global node version of a version manager (mise, nvm, asdf…) does not break it. After moving to
// another node version, install joplin and agentic-joplin there and run `agentic-joplin install` again.
export function buildPlist(): string {
  const nodeBin = process.execPath;
  const binDir = dirname(nodeBin);
  const joplinBin = process.env.JOPLIN_BIN ?? join(binDir, 'joplin');
  if (!existsSync(joplinBin)) {
    throw new Error(`joplin not found at ${joplinBin}. Install it for node ${process.version} or set JOPLIN_BIN.`);
  }
  // cli.ts when run from a checkout, dist/cli.js when installed from npm.
  const cli = join(import.meta.dirname, `cli${extname(import.meta.filename)}`);

  const env: Record<string, string> = { PATH: `${binDir}:/usr/bin:/bin`, JOPLIN_BIN: joplinBin };
  for (const key of ENV_KEYS) {
    const value = process.env[key];
    if (value !== undefined) env[key] = value;
  }
  const envXml = Object.entries(env)
    .map(([key, value]) => `    <key>${xml(key)}</key>\n    <string>${xml(value)}</string>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${xml(config.label)}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xml(nodeBin)}</string>
    <string>${xml(cli)}</string>
    <string>sync</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
${envXml}
  </dict>
  <key>StartInterval</key>
  <integer>${config.intervalSeconds}</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>ProcessType</key>
  <string>Background</string>
  <key>LowPriorityIO</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${xml(config.launchdLog)}</string>
  <key>StandardErrorPath</key>
  <string>${xml(config.launchdLog)}</string>
</dict>
</plist>
`;
}

function bootout() {
  spawnSync('launchctl', ['bootout', service], { stdio: 'ignore' });
}

export function install() {
  const plist = buildPlist();
  mkdirSync(dirname(plistPath), { recursive: true });
  mkdirSync(config.logDir, { recursive: true });
  writeFileSync(plistPath, plist);
  execFileSync('plutil', ['-lint', plistPath], { stdio: 'inherit' });
  bootout();
  execFileSync('launchctl', ['bootstrap', domain, plistPath], { stdio: 'inherit' });
  console.log(`installed ${plistPath}\nruns every ${config.intervalSeconds / 60} min, log: ${config.syncLog}`);
}

export function uninstall() {
  bootout();
  if (existsSync(plistPath)) unlinkSync(plistPath);
  console.log(`removed ${plistPath}`);
}

export function status() {
  const loaded = spawnSync('launchctl', ['print', service], { encoding: 'utf8' });
  if (loaded.status !== 0) {
    console.log('agent: not loaded');
  } else {
    const field = (name: string) => loaded.stdout.match(new RegExp(`^\\s*${name} = (.*)$`, 'm'))?.[1] ?? '-';
    console.log(`agent: loaded (state = ${field('state')}, runs = ${field('runs')}, last exit code = ${field('last exit code')})`);
  }
  console.log(JSON.stringify(loadState(), null, 2));
}

export function kickstart() {
  execFileSync('launchctl', ['kickstart', service], { stdio: 'inherit' });
}

export function followLogs() {
  spawnSync('tail', ['-n', '50', '-f', config.syncLog], { stdio: 'inherit' });
}
