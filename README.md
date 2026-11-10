# agentic-joplin

Keep the [Joplin](https://joplinapp.org) terminal client in sync on macOS, unattended.

The Joplin CLI only syncs when you run `joplin sync`. `agentic-joplin` installs a small launchd
agent that does it for you every 15 minutes and handles the parts a cron one-liner gets wrong:

- **No overlapping runs.** A run that starts while the previous one is still going is skipped. A run
  that exceeds the timeout (90 min by default) is killed, so a hung sync cannot block the next ones
  forever. Locks left behind by a killed or crashed run are detected and taken over.
- **Failure notifications.** A macOS notification is shown when a sync fails (non-zero exit,
  timeout, or item errors reported by Joplin), again every hour while it keeps failing, and once
  more when it recovers. If syncing is blocked for 2 hours because another `joplin` process holds
  Joplin's own sync lock, you get a "stalled" notification.
- **Bounded logs.** Its own logs are rotated by size, and so is Joplin's `log.txt`, which the CLI
  only rotates in interactive mode and otherwise grows forever.
- **E2EE aware.** Each run follows `joplin sync` with `joplin e2ee decrypt`, because the CLI exits
  before its background decryption worker finishes.

It has no runtime dependencies: TypeScript runs directly on Node's built-in type stripping.

## Requirements

- macOS (uses launchd and `osascript`)
- Node.js 24 or later
- The Joplin CLI installed for that same Node version and already configured: sync target set up,
  authenticated, and the E2EE master password entered if you use encryption. Check that
  `joplin sync` works when you run it by hand first.

```bash
npm install -g joplin
```

If the install fails while building `sharp` against a Homebrew `libvips`, retry with
`SHARP_IGNORE_GLOBAL_LIBVIPS=1`. If npm skips install scripts, allow the native modules with
`--allow-scripts=keytar,sharp,sqlite3`.

## Install

```bash
git clone https://github.com/rafaelp/agentic-joplin.git
cd agentic-joplin
npm install            # dev dependencies only (TypeScript, @types/node)
npm run sync           # one run in the foreground, to check that everything works
npm run agent:install  # write ~/Library/LaunchAgents/agentic-joplin.plist and load it
```

The agent runs the Node binary that ran `agent:install`, by absolute path, and looks for `joplin`
next to it. Switching your global Node version (mise, nvm, asdf…) therefore does not break it. If
you remove that Node version, install Joplin on the new one and run `npm run agent:install` again.

## Usage

| Command | What it does |
| --- | --- |
| `npm run sync` | Run one sync now, in the foreground |
| `npm run agent:run` | Ask launchd to start a run now |
| `npm run status` | Show whether the agent is loaded, plus the last run, success and error |
| `npm run logs` | Follow the sync log |
| `npm run agent:print` | Print the plist that `agent:install` would write |
| `npm run agent:uninstall` | Unload the agent and delete its plist |

Files:

| Path | Content |
| --- | --- |
| `~/Library/LaunchAgents/agentic-joplin.plist` | The launchd agent |
| `~/Library/Logs/agentic-joplin/sync.log` | One line per event: start, result, skips, errors, notifications |
| `~/Library/Logs/agentic-joplin/launchd.log` | Anything the process writes to stdout/stderr (crashes) |
| `~/Library/Application Support/agentic-joplin/state.json` | Consecutive failures/skips, last run, last success, last error |
| `~/Library/Application Support/agentic-joplin/sync.lock` | PID of the run in progress |

## Configuration

Settings are environment variables. Set them when running `npm run agent:install` and they are
written into the plist, so they also apply to scheduled runs:

```bash
AJ_INTERVAL_MIN=30 AJ_SYNC_TIMEOUT_MIN=120 npm run agent:install
```

| Variable | Default | Meaning |
| --- | --- | --- |
| `AJ_INTERVAL_MIN` | `15` | Minutes between runs |
| `AJ_SYNC_TIMEOUT_MIN` | `90` | Kill `joplin sync` after this many minutes |
| `AJ_DECRYPT_TIMEOUT_MIN` | `15` | Kill `joplin e2ee decrypt` after this many minutes |
| `AJ_LOG_MAX_MB` | `1` | Rotate `sync.log` and `launchd.log` above this size |
| `AJ_LOG_KEEP` | `5` | Rotated copies to keep of each of those logs |
| `AJ_JOPLIN_LOG_MAX_MB` | `10` | Rotate Joplin's `log.txt` above this size |
| `AJ_JOPLIN_LOG_KEEP` | `3` | Rotated copies of `log.txt` to keep |
| `AJ_RENOTIFY_EVERY` | `4` | While failing, notify again every N failed runs |
| `AJ_SKIPS_BEFORE_NOTIFY` | `8` | Skipped runs in a row (Joplin lock held elsewhere) before a "stalled" notification |
| `AJ_NOTIFY` | `1` | Set to `0` to only log, without notifications |
| `AJ_LABEL` | `agentic-joplin` | launchd label, also used for the log and state directories |
| `JOPLIN_PROFILE` | Joplin's default | Profile directory, passed to joplin as `--profile` |
| `JOPLIN_BIN` | `joplin` next to `node` | Path to the joplin executable |

To run a second agent for another Joplin profile, give it its own label:

```bash
AJ_LABEL=agentic-joplin-work JOPLIN_PROFILE=~/.config/joplin-work npm run agent:install
```

## How a run works

1. Take the lock. If another run holds it, log a skip and exit.
2. Rotate logs that are over their size limit.
3. Run `joplin sync` with a timeout. If Joplin says its own sync lock is held, for example by a
   `joplin` you started by hand, the run is a skip, not a failure.
4. Treat a timeout, a non-zero exit, or item errors (the `Last error:` line in the output, or the
   untranslated "There was some errors" warning in `log.txt`) as a failure.
5. Run `joplin e2ee decrypt` with its own timeout.
6. Update `state.json`, notify if needed, and release the lock.

launchd itself never starts a second copy of a job that is still running. The lock covers the other
cases, such as `npm run sync` by hand while the agent runs.

## Notifications

Notifications go through `osascript`, so macOS shows them as coming from **Script Editor**. If none
show up, enable Script Editor in System Settings → Notifications. To check that they work, run
something that fails, without touching your real state, by pointing the label elsewhere:

```bash
AJ_LABEL=agentic-joplin-test JOPLIN_BIN=/usr/bin/false npm run sync
rm -rf ~/Library/Logs/agentic-joplin-test ~/Library/Application\ Support/agentic-joplin-test
```

## Development

```bash
npm run typecheck
```

The code is erasable-syntax TypeScript (no enums, namespaces or parameter properties) so Node can
run it without a build step. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
