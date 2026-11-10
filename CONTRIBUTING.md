# Contributing

Thanks for helping. Bug reports, fixes and small features are welcome.

## Before you start

- For anything bigger than a bug fix, open an issue first so we can agree on the approach.
- Security problems go through [SECURITY.md](SECURITY.md), not public issues.
- This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).

## Setup

```bash
npm install
npm run typecheck
node src/cli.ts help        # run the CLI straight from the sources
```

Node 24+ runs the `.ts` files directly through type stripping, so development needs no build. Keep
the code to erasable syntax (`erasableSyntaxOnly` in `tsconfig.json` enforces it) and import local
files with their `.ts` extension.

Node does not strip types inside `node_modules`, so the npm package ships JavaScript. `npm run build`
compiles `src/` to `dist/` (and rewrites the `.ts` imports), and `npm pack`/`npm publish` run it
automatically. To try the package exactly as users get it:

```bash
npm pack && npm install -g ./rafaelp-aios-agentic-joplin-*.tgz && agentic-joplin --version
```

## Guidelines

- **No runtime dependencies.** The agent runs every 15 minutes from launchd. Keeping it on the Node
  standard library means nothing to install or audit, and nothing to break on upgrade.
- **Never run commands through a shell.** Use `spawn`/`execFile` with an argument array.
- **New settings are environment variables.** Add them to `ENV_KEYS` and `config` in
  `src/config.ts` so `agentic-joplin install` copies them into the plist, and document them in the README.
- **Joplin output is translated.** Do not detect states by matching English CLI messages alone.
  Prefer exit codes, file names or the untranslated `log.txt` entries, as `src/joplin.ts` does.

## Claude Code plugin

The plugin lives in `plugins/agentic-joplin/`, and the marketplace manifest in
`.claude-plugin/marketplace.json`. When you change a skill:

- Check every command it teaches against a throwaway profile, never your real notes:
  `joplin --profile /tmp/joplin-test …`.
- Keep the safety rules: never open the TUI or `edit`, use IDs for writes, open SQLite read-only,
  confirm before destructive commands, and never put the master password on a command line.
- Validate the manifests and try the plugin from disk:

```bash
claude plugin validate .
claude plugin validate plugins/agentic-joplin
claude --plugin-dir plugins/agentic-joplin -p "/joplin ls /"
```

- Bump `version` in both `plugin.json` and `marketplace.json` when you release a change.

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
