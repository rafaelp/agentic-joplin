# Contributing

Thanks for helping. Bug reports, fixes and small features are welcome.

## Before you start

- For anything bigger than a bug fix, open an issue first so we can agree on the approach.
- Security problems go through [SECURITY.md](SECURITY.md), not public issues.

## Setup

```bash
npm install
npm run typecheck
```

There is no build step: Node 24+ runs the `.ts` files directly through type stripping. Keep the
code to erasable syntax (`erasableSyntaxOnly` in `tsconfig.json` enforces it) and import local
files with their `.ts` extension.

## Guidelines

- **No runtime dependencies.** The agent runs every 15 minutes from launchd. Keeping it on the Node
  standard library means nothing to install or audit, and nothing to break on upgrade.
- **Never run commands through a shell.** Use `spawn`/`execFile` with an argument array.
- **New settings are environment variables.** Add them to `ENV_KEYS` and `config` in
  `src/config.ts` so `agent:install` copies them into the plist, and document them in the README.
- **Joplin output is translated.** Do not detect states by matching English CLI messages alone.
  Prefer exit codes, file names or the untranslated `log.txt` entries, as `src/joplin.ts` does.

## Testing a change

There is no automated test suite yet. Exercise the paths you touched with a separate label, so your
real agent and state are not affected, and a fake `joplin`:

```bash
printf '#!/bin/sh\nexit 1\n' > /tmp/fake-joplin && chmod +x /tmp/fake-joplin
AJ_LABEL=aj-test AJ_NOTIFY=0 JOPLIN_BIN=/tmp/fake-joplin npm run sync
cat ~/Library/Logs/aj-test/sync.log
rm -rf ~/Library/Logs/aj-test ~/Library/Application\ Support/aj-test
```

Useful cases: a successful sync, a failing one, one that hangs past `AJ_SYNC_TIMEOUT_MIN=0.05`, two
runs started at once, and a fake that prints a path containing `synclock_` (Joplin's lock held).

## Pull requests

- Keep each PR focused on one change, with a short description of what it does and how you tested it.
- Run `npm run typecheck` before pushing.
- Add an entry under "Unreleased" in [CHANGELOG.md](CHANGELOG.md).

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
