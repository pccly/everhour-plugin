#!/usr/bin/env node
// Minimal stdio MCP server (newline-delimited JSON-RPC 2.0) exposing Everhour time logging.

import { createInterface } from "node:readline";
import { EverhourError, logTime, searchTasks } from "./lib/everhour.mjs";

const TOOLS = [
  {
    name: "find_task",
    description:
      "Search Everhour tasks by tracker key (e.g. QA-1049) or name words. Returns id, key, status, and name for each match.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Tracker key or words from the task name" },
        include_closed: { type: "boolean", description: "Include closed or done tasks (default true)" },
      },
      required: ["query"],
    },
    run: async ({ query, include_closed = true }) => {
      const tasks = await searchTasks(query, { includeClosed: include_closed, limit: 20 });
      if (!tasks.length) return `No Everhour tasks match "${query}".`;
      return tasks.map((t) => `${t.id}\t${t.number ?? "-"}\t${t.status ?? "-"}\t${t.name}`).join("\n");
    },
  },
  {
    name: "log_time",
    description:
      "Log time on one Everhour task for the current user. `task` is a tracker key that exactly equals the task's key " +
      "(e.g. QA-1049), an exact task name, or an Everhour task id (li:..., ev:...). Refuses to add a second entry " +
      "on the same task and day unless force is true.",
    inputSchema: {
      type: "object",
      properties: {
        task: { type: "string", description: "Tracker key, exact task name, or Everhour task id" },
        duration: { type: "string", description: "30m, 2h, 1h15m, 1:30, 1.5h, or minutes" },
        date: { type: "string", description: "YYYY-MM-DD, today, or yesterday (default today)" },
        comment: { type: "string", description: "Optional note on the time entry" },
        dry_run: { type: "boolean", description: "Resolve and validate without logging" },
        force: { type: "boolean", description: "Add even if time already exists for this task and day" },
      },
      required: ["task", "duration"],
    },
    run: (args) =>
      logTime({
        task: args.task,
        duration: args.duration,
        date: args.date,
        comment: args.comment,
        dryRun: args.dry_run,
        force: args.force,
      }),
  },
];

const send = (message) => process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`);

async function handle({ id, method, params }) {
  switch (method) {
    case "initialize":
      return {
        protocolVersion: params?.protocolVersion ?? "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "everhour", version: "0.2.1" },
      };
    case "ping":
      return {};
    case "tools/list":
      return { tools: TOOLS.map(({ run, ...tool }) => tool) };
    case "tools/call": {
      const tool = TOOLS.find((t) => t.name === params?.name);
      if (!tool) throw Object.assign(new Error(`Unknown tool ${params?.name}`), { code: -32602 });
      try {
        return { content: [{ type: "text", text: await tool.run(params.arguments ?? {}) }] };
      } catch (error) {
        if (!(error instanceof EverhourError)) throw error;
        return { content: [{ type: "text", text: error.message }], isError: true };
      }
    }
    default:
      if (id === undefined) return undefined;
      throw Object.assign(new Error(`Method not found: ${method}`), { code: -32601 });
  }
}

createInterface({ input: process.stdin }).on("line", async (line) => {
  if (!line.trim()) return;
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return send({ id: null, error: { code: -32700, message: "Parse error" } });
  }
  try {
    const result = await handle(message);
    if (message.id !== undefined) send({ id: message.id, result });
  } catch (error) {
    if (message.id !== undefined) send({ id: message.id, error: { code: error.code ?? -32603, message: error.message } });
  }
});
