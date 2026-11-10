# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

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
