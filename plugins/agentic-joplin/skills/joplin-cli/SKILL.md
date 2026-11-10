---
name: joplin-cli
description: How to read, search, create, edit, organize, sync and export Joplin notes with the Joplin terminal app (`joplin` CLI) without hanging on its interactive UI. Use when the user asks about their Joplin notes, notebooks, to-dos or tags, wants to find, read, add or change something in Joplin, or asks to sync, decrypt, import or export Joplin data from the terminal.
---

# Joplin CLI

The `joplin` executable is the Joplin terminal app (https://joplinapp.org/help/apps/terminal/). It
has two modes:

- **Interactive mode** is a full-screen TUI, started by running `joplin` with no arguments. **Never
  run it**, because it blocks the shell until someone quits it by hand.
- **Shell mode**, `joplin <command> [args]`, runs one command and exits. Use this mode for
  everything.

`joplin help all` prints every command, and `joplin help <command>` prints one.

## Before the first command

```bash
joplin version
```

- `command not found`, or `mise ERROR No version is set for shim: joplin` (and the nvm/asdf
  equivalents), means Joplin is installed for a different Node version than the active one. Tell the
  user. Either install it for the active Node (`npm install -g joplin`) or run it through the Node
  that has it (`mise exec node@<version> -- joplin …`).
- Commands act on one **profile**, by default `~/.config/joplin`. `--profile <dir>` selects another
  one, and it goes before the command: `joplin --profile ~/.config/joplin-work ls /`.
- Messages follow the `locale` setting, so they may not be in English. Prefer `-f json` output, IDs
  and exit codes over matching message text.

## Referring to notes and notebooks

- Every item has a 32-character hex ID. `ls -l` shows the first 5 characters, and that prefix is
  accepted anywhere an item is expected (`joplin cat ada7a`).
- Titles work too, but they are resolved **only inside the current notebook**, and **duplicate
  titles resolve silently to one of the matches**. Use titles for quick reads only. Use IDs for
  anything that writes, moves or deletes.
- Quote titles that contain spaces: `joplin cat "Meeting notes"`.
- The current notebook is a persistent setting, shared with other `joplin` invocations. Change it
  with `joplin use <notebook>`.

## Reading

| Task | Command |
| --- | --- |
| List notebooks | `joplin ls /` (add `-l` for IDs and note counts) |
| Switch notebook | `joplin use "Notebook"` or `joplin use <id>` |
| List notes in the current notebook | `joplin ls -l` |
| Machine-readable list | `joplin ls -f json` / `joplin ls / -f json` |
| Filter by title | `joplin ls "Meet*"` (a pattern on titles, current notebook only) |
| Limit or sort | `joplin ls -n 10 -s updated_time -r` |
| Only to-dos / only notes | `joplin ls -tt` / `joplin ls -tn` |
| Read a note | `joplin cat <id>` (title, a blank line, then the Markdown body) |
| Read with metadata | `joplin cat -v <id>` (id, parent_id, times, source_url, …) |
| Tags | `joplin tag list`, `joplin tag list <tag>` (notes with the tag), `joplin tag notetags <id>` |
| Counts and sync state | `joplin status` |

`joplin ls /` also lists notebooks that are **in the trash**. To know whether a notebook is really
live, check `deleted_time` in the database (see below).

## Searching

`joplin search` does not work in shell mode ("only available in GUI mode"), and `ls` only matches
titles in one notebook. To search across everything, query the profile's SQLite database
**read-only**:

```bash
sqlite3 -readonly -separator ' | ' ~/.config/joplin/database.sqlite "
  SELECT substr(n.id,1,5), f.title, n.title
  FROM notes n LEFT JOIN folders f ON f.id = n.parent_id
  WHERE n.deleted_time = 0 AND (n.title LIKE '%term%' OR n.body LIKE '%term%')
  ORDER BY n.user_updated_time DESC LIMIT 20"
```

- Always pass `-readonly`, and never write to this database: changes made there bypass sync and can
  corrupt the profile. Make every change through `joplin` commands.
- Useful tables: `notes` (title, body, parent_id, is_todo, todo_completed, todo_due, deleted_time),
  `folders` (title, parent_id, deleted_time), `tags`, `note_tags` (note_id, tag_id), `resources`
  (attachments).
- `notes_fts` is a full-text index (`WHERE notes_fts MATCH 'term'`), but the CLI does not keep it
  fully up to date. Use it for speed and `LIKE` for completeness.
- With end-to-end encryption, bodies are only readable after decryption. A row with
  `encryption_applied = 1` has not been decrypted yet (run `joplin e2ee decrypt`).
- Timestamps are milliseconds since the epoch.

## Creating and editing

`edit` opens an external editor and blocks, so **do not use `edit`**. Write content with `set`.

```bash
joplin use <notebook-id>                 # mknote/mktodo create in the current notebook
joplin mknote "Title"                    # prints nothing; find the new ID afterwards:
joplin ls -f json -s created_time -r -n 1
joplin set <id> body "$(cat /path/to/body.md)"   # body is Markdown; this replaces the whole body
joplin set <id> title "New title"
```

- To **append** to a note, read the body with `joplin cat <id>`, drop the first line (the title)
  and the blank line after it, add the new text, and `set` the full body back.
- `joplin mkbook "Name"` creates a notebook. `-p <parent>` creates it inside another one.
- `joplin mktodo "Title"` creates a to-do. `joplin set <id> todo_due <ms-epoch>` sets its due date.
- `joplin done <id>` / `joplin undone <id>` mark a to-do. `joplin todo toggle <id>` converts a note
  into a to-do and toggles it, and `joplin todo clear <id>` turns it back into a note.
- `joplin attach <id> <file>` adds an attachment and links it at the end of the body.
- `joplin tag add <tag> <id>` / `joplin tag remove <tag> <id>`. The tag is created if needed.
- `joplin mv <id> <notebook>`, `joplin ren <id> "New name"` (works for notes and notebooks), and
  `joplin cp <id> [notebook]` (duplicate).
- `set` accepts any note property (`joplin help set` lists them). Change `source_url`, `author`,
  `is_todo` and similar fields freely. Never set `id`, `parent_id` (use `mv`), `encryption_*` or
  `share_id` by hand.

## Deleting and restoring

- `joplin rmnote <id>` asks for confirmation, so pass `-f` in shell mode. The note goes to the
  trash. `-p` deletes it permanently.
- `joplin rmbook <notebook> -f` moves a notebook and its notes to the trash. `-p` is permanent.
- `joplin restore <id>` takes an item out of the trash. **Trashed items cannot be found by title**,
  so get the ID from the database (`SELECT id, title FROM notes WHERE deleted_time > 0`).
- Deletions sync to every device. Confirm with the user before deleting anything, and never use
  `-p` unless they explicitly asked for a permanent delete.

## Sync and encryption

```bash
joplin sync && joplin e2ee decrypt
```

- `joplin sync` pushes local changes and pulls remote ones. In shell mode it also downloads
  attachments before exiting, so a first sync of a large account can take a long time. Run it in
  the background, or with a generous timeout.
- The CLI exits before its background decryption finishes. Always follow `sync` with
  `e2ee decrypt`, or some items stay "Downloaded and encrypted".
- "Lock file is already being hold…" means another `joplin` process is syncing the same profile.
  The command exits with code 0 and syncs nothing. Wait and retry. Do not delete lock files and do
  not pass `--use-lock 0`.
- `joplin e2ee status` shows whether encryption is enabled. `joplin e2ee target-status -v` shows
  the state of the sync target.
- Do not run `e2ee enable`, `e2ee disable` or `sync --upgrade` unless the user explicitly asks:
  they change the data on every device.
- Never pass the master password with `-p`, because it ends up in shell history and process lists.
  If a command needs a password interactively, ask the user to run it themselves (in Claude Code:
  `! joplin e2ee decrypt`).
- The first sync to Dropbox or OneDrive prints an authorization URL and waits for a code. That is
  interactive, so the user has to run it.

Sync targets (`joplin config sync.target <n>`): 2 file system (`sync.2.path`), 5 Nextcloud,
6 WebDAV (`sync.N.path`/`username`/`password`), 7 Dropbox, 3 OneDrive, 8 S3, 9 Joplin Server,
10 Joplin Cloud. These numbers differ from the desktop app's. Changing the target or its path on a
profile that already has data can wipe local content. Confirm with the user first.

To keep a profile in sync unattended on macOS, see the agentic-joplin launchd agent:
https://github.com/rafaelp/agentic-joplin

## Configuration

- `joplin config <name>` reads a setting, and `joplin config <name> <value>` changes it.
  `joplin config` lists them all, and `-v` adds hidden ones.
- Settings worth knowing: `sync.resourceDownloadMode` (`always` downloads all attachments, `auto`
  only on open), `locale`, `editor`, `trash.ttlDays`, `revisionService.ttlDays`, `api.port`.
- `joplin config --export` prints **all settings including secrets** (sync passwords, tokens).
  Never run it to show output in the conversation.

## Import and export

```bash
joplin export /path/out --format md --notebook "Notebook"    # also: jex, raw, md_frontmatter; --note <id>
joplin import /path/file.enex "Notebook" --format enex -f    # also: auto, jex, raw, md, md_frontmatter, html, txt, obsidian, one
```

The `md` export writes one file per note in a folder tree that mirrors the notebooks. Importing
creates new items and does not merge with existing ones, so confirm the target notebook first.

## API server

`joplin server start` runs the Joplin Data API (port from the `api.port` setting) and keeps running,
so start it in the background. `joplin server status` and `joplin server stop` check and stop it.
The feature is experimental, and Joplin recommends running it on a separate `--profile` so that no
other CLI instance uses the same profile. Prefer shell commands unless the user needs the REST API.
