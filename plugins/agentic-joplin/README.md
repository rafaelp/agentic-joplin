# agentic-joplin plugin for Claude Code

This plugin helps Claude Code work with your [Joplin](https://joplinapp.org) notes through the
Joplin terminal app (`joplin`).

| Skill | How it is used | What it does |
| --- | --- | --- |
| `joplin-cli` | Loaded automatically when you ask about your Joplin notes | Teaches Claude the CLI without its traps: never opening the interactive UI or editor, IDs instead of ambiguous titles, read-only SQLite search (since `search` does not work in shell mode), `sync` followed by `e2ee decrypt`, and secrets kept out of the conversation |
| `joplin` | `/joplin [command] [args...]` | Runs a Joplin CLI command with the same syntax as `joplin`. It confirms before deletes, body overwrites, imports and account-wide changes, and offers alternatives for commands that would hang (`edit`, password prompts) |

## Install

```text
/plugin marketplace add rafaelp/agentic-joplin
/plugin install agentic-joplin@agentic-joplin
```

## Requirements

The `joplin` CLI must be installed and configured (`npm install -g joplin`, then set up sync by
running `joplin sync` once yourself). Searching also needs `sqlite3`, which ships with macOS.

## Examples

```text
/joplin ls /
/joplin use "Work"
/joplin ls -l
/joplin cat ada7a
/joplin mknote "Ideas for Q1"
/joplin tag add urgent ada7a
/joplin sync
```

Or ask in plain language, for example "what do my Joplin notes say about the Oi contract?" or "add
the meeting summary to my Projects notebook in Joplin".

## License

[MIT](../../LICENSE)
