---
name: log-work
description: Log time in Everhour against a tracker task (Linear key such as QA-1049, or an Everhour task id). Use when the user asks to log work, log time, report hours, or fill the Everhour timesheet for one or more tasks.
argument-hint: "<TASK-KEY> <duration> [date] [comment]"
---

# Log work in Everhour

Use the plugin's MCP tools `log_time` and `find_task`.

1. Collect, per task: the key or Everhour id, the duration (30m, 1h15m, 1:30), the date (default today), and an optional comment. Ask only for a missing duration; never guess hours.
2. For several tasks, call `log_time` once per task. Stop and report on the first error rather than retrying blindly.
3. If `log_time` reports no exact match or several matches, call `find_task` and pass the chosen Everhour id (`li:...`).
4. If it reports time already logged for that task and day, tell the user the existing amount and add more with `force: true` only when they confirm.
5. Report each logged entry as the tool returned it: key, task name, duration, date.
