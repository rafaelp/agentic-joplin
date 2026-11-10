# Security Policy

## Supported versions

Only the latest release receives fixes.

## Reporting a vulnerability

Please do not open a public issue for security problems. Report them privately through GitHub's
**Report a vulnerability** button on the repository's Security tab. Include the version, macOS and
Node versions, and steps to reproduce. You should get a reply within a week. Once a fix is
released, the report is published as an advisory with credit to you, unless you prefer otherwise.

## What agentic-joplin touches

The scope is small, which keeps the attack surface small:

- **Credentials.** agentic-joplin never reads, stores or passes sync credentials or the E2EE master
  password. It only runs `joplin sync` and `joplin e2ee decrypt`, and Joplin gets its secrets from
  its own profile (on macOS the CLI keeps them in the Keychain).
- **Commands.** It runs only the `joplin` executable from the plist (`JOPLIN_BIN`), always with a
  fixed argument list, and never through a shell. It also runs `osascript` with the notification
  text passed as arguments, not interpolated into the script.
- **Network.** It opens no sockets and makes no requests. All network traffic comes from Joplin
  itself.
- **Files.** It writes only to `~/Library/LaunchAgents/<label>.plist`,
  `~/Library/Logs/<label>/` and `~/Library/Application Support/<label>/`, and it renames Joplin's
  `log.txt` when rotating it.

## Things to be aware of

- **Logs and notifications can contain note data.** Error messages from Joplin can include note or
  notebook titles and remote paths. They end up in `sync.log`, `state.json` and notifications,
  which macOS may show on the lock screen. Set `AJ_NOTIFY=0` if that matters to you, and treat the
  log directory as private.
- **The plist pins executables by absolute path.** Anyone who can write to that Node installation
  or to `JOPLIN_BIN` can run code as you every 15 minutes. That is true of any globally installed
  npm package, but keep the install inside your home directory and not world-writable.
- **Environment variables are copied into the plist.** Only the documented `AJ_*`, `JOPLIN_PROFILE`
  and `JOPLIN_BIN` variables are copied. Do not put secrets in them.
