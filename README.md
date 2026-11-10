<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/logo-dark.png">
    <img src=".github/assets/logo.png" alt="agentic-joplin" height="80">
  </picture>
</p>

<p align="center">
  <strong>Your Joplin notes, always in sync and within reach of your AI agent.</strong><br>
  Sync · Watch · Ask<br>
  <sub>A launchd agent for the Joplin terminal app, plus a Claude Code plugin</sub>
</p>

<p align="center">
  <a href="https://github.com/rafaelp/agentic-joplin/actions/workflows/ci.yml"><img src="https://github.com/rafaelp/agentic-joplin/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2f80ed" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/macOS-launchd-5b3fd9" alt="macOS launchd">
  <img src="https://img.shields.io/badge/node-%E2%89%A524-417e38" alt="Node 24 or later">
  <img src="https://img.shields.io/badge/runtime%20deps-0-59636e" alt="Zero runtime dependencies">
</p>

## What is agentic-joplin?

[Joplin](https://joplinapp.org) has an excellent terminal app, but it only syncs when you run
`joplin sync`, and an AI agent that drives it can easily get stuck in its interactive UI.
agentic-joplin fixes both:

- **A sync agent for macOS.** A launchd job runs `joplin sync` and `joplin e2ee decrypt` every 15
  minutes. It never lets two runs overlap, kills a sync that hangs, keeps the logs small and shows
  a notification when something breaks.
- **A Claude Code plugin.** It teaches Claude how to use the Joplin CLI safely and adds a `/joplin`
  command that takes the same commands as the CLI.

```text
$ npm run agent:install
installed ~/Library/LaunchAgents/agentic-joplin.plist
runs every 15 min, log: ~/Library/Logs/agentic-joplin/sync.log

$ npm run logs
2026-11-10T03:37:02Z [73871] sync started
2026-11-10T03:37:10Z [73871] sync: Fetched items: 1/1. Completed: 10/11/2026 00:37 (4s)
2026-11-10T03:37:12Z [73871] decrypt: Decrypted items: 0 | Completed decryption.
2026-11-10T03:37:12Z [73871] ok in 11s
```

```text
> /joplin ls /
> /joplin cat ada7a
> what do my Joplin notes say about the Oi contract?
```

## Highlights

- **No overlapping runs.** A PID lock skips a run while the previous one is still going, and
  detects locks left behind by a crash.
- **Hung syncs are killed.** A sync that runs past the timeout (90 minutes by default) is stopped
  and reported, so it cannot block the next runs.
- **Notifications that respect your attention.** You are notified on the first failure, again
  every hour while it keeps failing, once when it recovers, and when syncing stalls because
  another `joplin` process holds the lock.
- **Bounded logs.** It rotates its own logs and Joplin's `log.txt`, which the CLI only rotates in
  interactive mode.
- **E2EE aware.** Each sync is followed by `e2ee decrypt`, because the CLI exits before its
  background decryption finishes.
- **Survives Node upgrades.** The agent pins the Node binary by absolute path, so switching your
  global version in mise, nvm or asdf does not break it.
- **Agent-safe Joplin.** The plugin keeps Claude out of the TUI and the external editor, uses IDs
  instead of ambiguous titles, searches through a read-only SQLite query, and asks before deleting
  anything or making changes that affect every device.
- **Nothing to install at runtime.** TypeScript runs on Node's built-in type stripping, with only
  the standard library.

## Quick start

Requirements: macOS, Node.js 24+, and the Joplin terminal app installed for that Node version and
already configured (`joplin sync` works when you run it by hand).

```bash
npm install -g joplin   # if you don't have it yet; then configure sync and run `joplin sync` once

git clone https://github.com/rafaelp/agentic-joplin.git
cd agentic-joplin
npm install             # dev dependencies only (TypeScript, @types/node)
npm run sync            # one run in the foreground, to check that everything works
npm run agent:install   # install and start the launchd agent
```

<details>
<summary>Installing Joplin fails while building <code>sharp</code>, or npm skips install scripts</summary>

If `sharp` tries to compile against a Homebrew `libvips` and fails, set
`SHARP_IGNORE_GLOBAL_LIBVIPS=1`. If npm skips install scripts, allow the native modules:

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install -g joplin --allow-scripts=keytar,sharp,sqlite3
```

</details>

## Claude Code plugin

This repository is also a Claude Code plugin marketplace. In Claude Code:

```text
/plugin marketplace add rafaelp/agentic-joplin
/plugin install agentic-joplin@agentic-joplin
```

| Skill | Use | What it does |
| --- | --- | --- |
| `joplin-cli` | Loaded automatically when you ask about your Joplin notes | Reading, searching, creating, editing, organizing, syncing and exporting notes through the CLI, without its traps |
| `joplin` | `/joplin [command] [args...]` | Runs a Joplin CLI command and asks for confirmation before destructive or account-wide ones |

The plugin works without the sync agent, and on any OS where the Joplin CLI runs. See the
[plugin README](plugins/agentic-joplin/README.md) for details.

## Usage

| Command | What it does |
| --- | --- |
| `npm run sync` | Run one sync now, in the foreground |
| `npm run agent:run` | Ask launchd to start a run now |
| `npm run status` | Show whether the agent is loaded, plus the last run, success and error |
| `npm run logs` | Follow the sync log |
| `npm run agent:print` | Print the plist that `agent:install` would write |
| `npm run agent:uninstall` | Unload the agent and delete its plist |

| Path | Content |
| --- | --- |
| `~/Library/LaunchAgents/agentic-joplin.plist` | The launchd agent |
| `~/Library/Logs/agentic-joplin/sync.log` | One line per event: start, result, skips, errors, notifications |
| `~/Library/Logs/agentic-joplin/launchd.log` | Anything the process writes to stdout/stderr (crashes) |
| `~/Library/Application Support/agentic-joplin/state.json` | Consecutive failures/skips, last run, last success, last error |
| `~/Library/Application Support/agentic-joplin/sync.lock` | PID of the run in progress |

## Configuration

Settings are environment variables. Set them when you run `npm run agent:install` and they are
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

The agent runs the Node binary that ran `agent:install`, and looks for `joplin` next to it. If you
remove that Node version, install Joplin on the new one and run `npm run agent:install` again.

## How a run works

1. Take the lock. If another run holds it, log a skip and exit.
2. Rotate logs that are over their size limit.
3. Run `joplin sync` with a timeout. If Joplin says its own sync lock is held, for example by a
   `joplin` you started by hand, the run is a skip, not a failure.
4. Treat a timeout, a non-zero exit, or item errors (the `Last error:` line in the output, or the
   untranslated "There was some errors" warning in `log.txt`) as a failure.
5. Run `joplin e2ee decrypt` with its own timeout.
6. Update `state.json`, notify if needed, and release the lock.

Notifications go through `osascript`, so macOS shows them as coming from **Script Editor**. If none
appear, enable Script Editor in System Settings → Notifications.

## Repository layout

```text
agentic-joplin/
├── .claude-plugin/
│   └── marketplace.json   # Claude Code marketplace manifest
├── .github/               # CI, issue and pull request templates, logo
├── plugins/
│   └── agentic-joplin/    # Claude Code plugin
│       ├── .claude-plugin/plugin.json
│       └── skills/
│           ├── joplin/        # /joplin [command]
│           └── joplin-cli/    # How to use the Joplin CLI
└── src/                   # The sync agent (TypeScript, no build step)
    ├── agent.ts           # install, uninstall, status, print, run, logs
    ├── sync.ts            # One sync run
    ├── config.ts          # Settings and environment variables
    ├── joplin.ts          # Runs joplin with a timeout and reads its result
    ├── lock.ts            # PID lock
    ├── log.ts             # Logging and rotation
    ├── notify.ts          # macOS notifications
    └── state.ts           # Failure and skip counters
```

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or pull
request. Everything in this project (code, documentation, comments and commit messages) is written
in English.

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).

## Security

Please do not report vulnerabilities in public issues. See [SECURITY.md](SECURITY.md) for how to
report them privately.

## License

agentic-joplin is licensed under the [MIT License](LICENSE).

agentic-joplin is an independent project. It is not affiliated with or endorsed by Joplin or its
authors. "Joplin" is used only to describe what this project works with.
