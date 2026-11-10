# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.2.0] - 2026-11-10

### Added

- npm package `@rafaelp/agentic-joplin` with an `agentic-joplin` command: `sync`, `install`,
  `uninstall`, `status`, `run`, `logs`, `print`, `help` and `version`. The package ships compiled
  JavaScript, because Node does not strip types inside `node_modules`.

- Claude Code plugin marketplace with the `agentic-joplin` plugin:
  - `joplin-cli` skill, which teaches the Joplin terminal app: reading, read-only SQLite search,
    writing with `set`, trash, sync and E2EE, import and export.
  - `/joplin [command]` skill, which runs Joplin CLI commands and confirms destructive ones.
- Logo, Code of Conduct, CI (typecheck, manifests, packed package, plist and a smoke test), issue
  and pull request templates, and Dependabot.

### Changed

- The launchd agent now runs `agentic-joplin sync`. Agents installed with 0.1.0 point to
  `src/sync.ts`, which no longer runs a sync on its own: run `agentic-joplin install` again.

## [0.1.0] - 2026-11-10

### Added

- launchd agent that runs `joplin sync` followed by `joplin e2ee decrypt` every 15 minutes.
- A PID lock file that skips overlapping runs and takes over stale locks, plus a timeout that
  kills a hung sync.
- macOS notifications on failure, repeated while it keeps failing, on recovery, and when sync is
  stalled because Joplin's own lock is held elsewhere.
- Size-based rotation of its own logs and of Joplin's `log.txt`.
- `agent:install`, `agent:uninstall`, `agent:print`, `agent:run`, `status` and `logs` commands.
- Configuration through `AJ_*`, `JOPLIN_PROFILE` and `JOPLIN_BIN` environment variables.
