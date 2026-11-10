# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this repo is

- **Sync agent** (`src/`): TypeScript CLI `agentic-joplin`, published to npm as
  `@rafaelp-aios/agentic-joplin`. It installs a launchd agent that runs `joplin sync` +
  `joplin e2ee decrypt`. Development runs the `.ts` sources directly (`node src/cli.ts …`); the
  npm package ships `dist/`, built by `npm run build` (run automatically by `npm pack`/`npm publish`).
- **Claude Code plugin marketplace** (`.claude-plugin/marketplace.json`) with the `agentic-joplin`
  plugin in `plugins/agentic-joplin/` (skills `joplin-cli` and `joplin`).

Everything in the repo (code, docs, comments, commit messages) is in English. See
[CONTRIBUTING.md](CONTRIBUTING.md) for code guidelines and how to test.

## The maintainer's own setup

- The launchd agent on the maintainer's machine runs the package **installed from the npm
  registry**, not the checkout. Do not replace it with `npm link` or point the plist at this
  folder: a broken build or a branch switch would break their sync.
- The Claude Code plugin is installed from this folder (local marketplace). After changing a
  skill: `claude plugin update agentic-joplin@agentic-joplin`, then `/reload-plugins`.

## Release process

Always follow every step when releasing a new version.

1. **Version.** Bump `version` in `package.json` (semver). If the plugin changed, also bump it in
   `plugins/agentic-joplin/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`.
2. **Changelog.** Move the "Unreleased" entries in `CHANGELOG.md` to a new
   `## [x.y.z] - YYYY-MM-DD` section, and leave an empty "Unreleased".
3. **Check.** `npm run typecheck`, then `npm pack --dry-run` to confirm the name, version and file
   list.
4. **Commit and push** to `main`, and wait for CI to pass (`gh run watch`).
5. **Publish.** The maintainer runs `npm publish` in their own terminal, because npm requires 2FA
   through the browser. Ask them to run `cd ~/Projects/agentic-joplin && npm publish`. Never
   publish without being asked. The npm account is `rafaelp_`, which owns the `rafaelp-aios` org;
   the `@rafaelp` scope belongs to another account.
6. **Wait for the registry.** Poll `npm view @rafaelp-aios/agentic-joplin version` until it shows
   the new version (it can take a few minutes).
7. **Tag and GitHub release.** Tag the published commit and create the release with the changelog
   section as notes, followed by an "Install" section:

   ```bash
   git tag -a vX.Y.Z <commit> -m "vX.Y.Z" && git push origin vX.Y.Z
   gh release create vX.Y.Z --title "vX.Y.Z" --notes-file <notes.md> --latest
   ```

8. **Update the maintainer's install.** `npm install -g @rafaelp-aios/agentic-joplin`, then
   `agentic-joplin install`, then confirm with `agentic-joplin status` and the last lines of
   `~/Library/Logs/agentic-joplin/sync.log` that a run finished `ok`. Install the new version
   before uninstalling anything: removing the old package first leaves the launchd agent pointing
   at a missing file until the reinstall.
