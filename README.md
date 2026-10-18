# Everhour plugin

Log [Everhour](https://everhour.com) time against tracker tasks from Claude Code or Codex.
Look up a task by its tracker key (a Linear key such as `QA-1049`), an exact task name, or an
Everhour task id (`li:...`, `ev:...`), then log a duration for a day.

Not affiliated with or endorsed by Everhour.

## What it adds

- MCP tools `find_task` and `log_time`. `log_time` refuses to add a second entry for the same
  task and day unless `force` is set.
- The `log-work` skill, for requests such as "log 1h30m on QA-1049 yesterday".
- The `everhour-logwork` CLI (`bin/`), for example `everhour-logwork QA-1049 30m --dry-run`.

Requires Node.js on your PATH.

## Install

Claude Code:

```sh
claude plugin marketplace add pccly/everhour-plugin
claude plugin install everhour@everhour-plugin
```

Codex: add this folder as a plugin. The Codex manifest is in `.codex-plugin/`.

## API token

Get your token from Everhour > Settings > My Profile > Application Access. The plugin reads it
from, in order:

1. The plugin's `api_key` option (stored by Claude Code as a sensitive value).
2. The `EVERHOUR_API_KEY` environment variable.
3. On macOS, the Keychain item `everhour-api-key`:
   `security add-generic-password -a "$USER" -s everhour-api-key -w`

## License

MIT
