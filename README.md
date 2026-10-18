# Everhour plugin

Log [Everhour](https://everhour.com) time against tracker tasks from Claude Code or Codex.
Look up a task by its tracker key (a Linear key such as `QA-1049`), an exact task name, or an
Everhour task id (`li:...`, `ev:...`), then log a duration for a day.

Not affiliated with or endorsed by Everhour.

## What it adds

- MCP tools `find_task` and `log_time`. `log_time` refuses to add a second entry for the same
  task and day unless `force` is set.
- The `log-work` skill, for requests such as:
  - "Log 1h30m on QA-1049 for yesterday"
  - "Log 45m on QA-1049 and 2h on FRO-120 today, comment: code review"
  - "Find the Everhour task for the agenda header and log 30m on it"
- The `everhour-logwork` CLI (`bin/`), for example `everhour-logwork QA-1049 30m --dry-run`.

Requires Node.js on your PATH.

## Install

### Prompt your agent to set it up

The easiest way: paste this into Claude Code or Codex, and it installs the plugin and walks you through the token setup.

```text
Set up the Everhour plugin from https://github.com/pccly/everhour-plugin. Read its README first.
1. Install it for every agent CLI on my PATH (claude, codex) using the commands in the README's Install section. Show me each command before running it.
2. Help me add my Everhour API token. Tell me where to find it (README, "API token") and let me enter it myself: in Claude Code via /plugin configure everhour@everhour-plugin, or on macOS via the Keychain command, which prompts for it. Never ask me to paste the token into this chat, and never print, log, or write it to a file.
3. Tell me to start a new session and test it there with "Find the Everhour task <one of my task keys>". Do not log any time during setup.
```

### One command

Installs it in Claude Code and Codex, whichever are on your PATH:

```sh
curl -fsSL https://raw.githubusercontent.com/pccly/everhour-plugin/main/install.sh | sh
```

The script runs these commands; run them yourself to install in only one CLI:

```sh
claude plugin marketplace add pccly/everhour-plugin
claude plugin install everhour@everhour-plugin

codex plugin marketplace add pccly/everhour-plugin
codex plugin add everhour@everhour-plugin
```

To update, run `claude plugin marketplace update everhour-plugin` then
`claude plugin update everhour@everhour-plugin`, or `codex plugin marketplace upgrade everhour-plugin`
then the `codex plugin add` command again.

### Local install, without a marketplace

Clone the repository:

```sh
git clone https://github.com/pccly/everhour-plugin ~/everhour-plugin
```

Claude Code loads the plugin for one session:

```sh
claude --plugin-dir ~/everhour-plugin
```

`--plugin-dir` may not ask for the `api_key` option; if it doesn't, provide the token through
`EVERHOUR_API_KEY` or the macOS Keychain (see [API token](#api-token)).

Or register only the MCP tools, for Claude Code or Codex:

```sh
claude mcp add everhour --scope user -- node ~/everhour-plugin/server.mjs
codex mcp add everhour -- node ~/everhour-plugin/server.mjs
```

The MCP-only setup has no `api_key` option either. Use the Keychain, or add
`--env EVERHOUR_API_KEY=<token>` to the command, which stores the token in that CLI's config file.
To also get the `log-work` skill, copy `skills/log-work` into `~/.claude/skills/` or
`~/.agents/skills/`. Run `git pull` in the clone to update.

## API token

Get your personal token:

1. Sign in to Everhour and open **Settings > My Profile**
   ([direct link](https://app.everhour.com/#/account/profile)).
2. Scroll to **Application Access** and copy the API token. Create one there if none is shown.
3. Give it to the plugin using one of the options below.

The token acts as you, so time is logged on your own timesheet. Treat it like a password; if it
leaks, generate a new one in the same place. If you don't see **Application Access**, ask your
Everhour admin whether your plan or role includes API access.

The plugin reads the token from, in order:

1. The plugin's `api_key` option, stored by Claude Code as a sensitive value. In Claude Code, run
   `/plugin configure everhour@everhour-plugin` and paste the token.
2. The `EVERHOUR_API_KEY` environment variable, set before starting Claude Code or Codex.
3. On macOS, the Keychain item `everhour-api-key`. This command prompts for the token:
   `security add-generic-password -a "$USER" -s everhour-api-key -w`

## Troubleshooting

- **"No Everhour API key"**: none of the three token sources is set. Set one, then start a new session.
- **"-> 401"**: the token is wrong or was revoked. Create a new one in Everhour and update it.
- **"No tasks match ... exactly"** or **"Several tasks match"**: the key or name is ambiguous. The
  error lists candidates; pass the Everhour task id (`li:...`) instead, or call `find_task` first.
- **"already has ... Use force"**: you logged time on that task for that day before. Confirm and
  retry with `force`, or `--force` in the CLI.
- **Tools missing in a session**: check that `node` is on the PATH of the app that runs the agent.

## Privacy

The plugin talks only to the Everhour API (`api.everhour.com`) using your own token. It sends the
task lookups and time entries you ask for, and nothing else. The token stays on your machine, in
Claude Code's plugin settings, your environment, or your Keychain. There is no telemetry or
third-party service. Everhour's own [privacy policy](https://everhour.com/privacy) covers data
stored in Everhour.

## Support

Open an issue at https://github.com/pccly/everhour-plugin/issues.

## License

MIT
