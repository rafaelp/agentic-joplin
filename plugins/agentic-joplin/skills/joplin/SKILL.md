---
name: joplin
description: Run a Joplin CLI command, e.g. `/joplin ls /`, `/joplin cat <note>`, `/joplin sync`, `/joplin mknote "Title"`. Takes the same commands and arguments as the `joplin` terminal app.
argument-hint: "[command] [args...]"
disable-model-invocation: true
allowed-tools: Bash(joplin:*), Bash(sqlite3 -readonly:*)
---

# /joplin

Run `joplin $ARGUMENTS` and report the result. The arguments use the same syntax as the Joplin
terminal app (https://joplinapp.org/help/apps/terminal/). For details on any command, its gotchas
and how to search, follow the **joplin-cli** skill.

## 1. No arguments

If `$ARGUMENTS` is empty, do not run bare `joplin`: it opens the full-screen interactive UI and
blocks. Show this list instead and ask which command to run:

| Command | What it does |
| --- | --- |
| `ls /` · `ls [pattern]` · `use <notebook>` | List notebooks · list notes in the current notebook · switch notebook |
| `cat <note>` | Show a note (`-v` for metadata) |
| `mknote` · `mktodo` · `mkbook` `<title>` | Create a note, to-do or notebook (`mkbook -p <parent>`) |
| `set <note> <property> [value]` | Change a property, e.g. `title` or `body` |
| `mv` · `ren` · `cp` | Move, rename, duplicate |
| `tag add\|remove\|list\|notetags` | Manage tags |
| `done` · `undone` · `todo toggle\|clear` | To-dos |
| `attach <note> <file>` | Attach a file |
| `rmnote` · `rmbook` · `restore` | Delete to the trash, restore from it |
| `sync` · `e2ee <command>` · `status` | Sync, encryption, summary |
| `config [name] [value]` | Read or change settings |
| `import` · `export` | Import and export notes |
| `help [command]` · `version` | Help |

## 2. Commands that cannot run here

These wait for input and would hang. Do not run them; offer the alternative instead.

- **`edit <note>`**: opens an external editor. Ask what to change, then run `joplin cat <note>`,
  write the new body and run `joplin set <id> body "…"`.
- **`server start`**: keeps running. Offer to start it in the background, or ask the user to run
  `! joplin server start`.
- **A command that asks for the master password, or a first sync that prints an authorization
  URL** (Dropbox/OneDrive): stop and ask the user to run that exact command themselves with
  `! joplin …`.
- **`e2ee … -p <password>`, `e2ee … --password`, or `config --export`**: they expose secrets in
  history or in the conversation. Refuse, and explain the safer route (`! joplin e2ee decrypt`
  without `-p`; for `--export`, write to a file only if the user asks for that explicitly).

## 3. Confirm before destructive or account-wide commands

Typing a command is consent to run it, with these exceptions. For each of them, first show the exact
command and what it will affect (for deletes, `joplin cat <note>` or the notebook's note count). Run
it only after the user explicitly confirms:

- `rmnote`, `rmbook` (any form, and especially with `-p`/`--permanent`)
- `set <note> body …` (replaces the whole body)
- `import`
- `sync --upgrade`, `sync --use-lock 0`, `e2ee enable`, `e2ee disable`
- `config sync.target …` or `config sync.<n>.path …`, which can wipe local data
- `share add|remove|delete|leave`

`rmnote` and `rmbook` prompt for confirmation in shell mode. After the user confirms, add `-f` so
the command does not hang.

## 4. Run it

```bash
joplin $ARGUMENTS
```

- Keep the user's quoting. Titles with spaces must stay in one argument.
- For a command that refers to a note or notebook by title, and writes, moves or deletes it, make
  sure the title is unique first (`joplin ls -f json` or the read-only SQL search in joplin-cli).
  Titles resolve only inside the current notebook, and duplicates resolve silently to one of them.
  If the title is ambiguous, list the matches with their IDs and ask which one.
- **`sync`**: run `joplin sync`, then `joplin e2ee decrypt`. The CLI exits before decryption
  finishes. A large first sync can take a long time, so use a long timeout or run it in the
  background. "Lock file is already being hold" means another process is syncing; say so, and do
  not delete the lock.
- **`search …`**: it only works in the interactive UI. Run the read-only SQLite search from the
  joplin-cli skill and show the results like `ls -l` would.
- **`mknote`/`mktodo`/`mkbook`**: they print nothing. Afterwards, get the new item's ID
  (`joplin ls -f json -s created_time -r -n 1`, or `joplin ls / -f json` for notebooks) and
  report it.
- Prefer the item's ID over its title for follow-up commands in the same turn.

## 5. Report

- Show the command's output, condensed if it is long. For `-f json`, summarize as a table with
  short ID, title and the relevant fields.
- For a write, confirm what changed and show the item's ID.
- If the command failed (non-zero exit code, or a message such as `Cannot find "…"`), show the
  message. Then suggest the likely fix: wrong current notebook (`joplin use …`), a trashed item
  that needs its ID, or a missing argument (`joplin help <command>`).
