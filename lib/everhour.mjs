// Everhour public API client shared by the MCP server and the CLI.
// API reference: https://everhour.docs.apiary.io (blueprint: https://jsapi.apiary.io/apis/everhour.apib).
// Linear-synced tasks have ids like "li:<uuid>" and carry the Linear key in `number` (e.g. "QA-1049").

import { execFileSync } from "node:child_process";

const API = "https://api.everhour.com";
const KEYCHAIN_SERVICE = "everhour-api-key";

export class EverhourError extends Error {}

// Plugin userConfig arrives as EVERHOUR_API_KEY; an unset option may arrive as the literal placeholder.
export function apiKey() {
  const fromEnv = process.env.EVERHOUR_API_KEY?.trim();
  if (fromEnv && !fromEnv.startsWith("${")) return fromEnv;
  try {
    return execFileSync("security", ["find-generic-password", "-s", KEYCHAIN_SERVICE, "-w"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    throw new EverhourError(
      `No Everhour API key. Set the plugin's api_key option, EVERHOUR_API_KEY, or the Keychain item "${KEYCHAIN_SERVICE}" ` +
        `(security add-generic-password -a "$USER" -s ${KEYCHAIN_SERVICE} -w). The token is under Everhour > Settings > My Profile > Application Access.`,
    );
  }
}

export async function api(method, path, body) {
  const key = apiKey();
  for (let attempt = 0; attempt < 3; attempt++) {
    let res, text;
    try {
      res = await fetch(API + path, {
        method,
        headers: { "X-Api-Key": key, "X-Accept-Version": "1.2", "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15_000),
      });
      text = await res.text();
    } catch (error) {
      throw new EverhourError(`${method} ${path} -> ${error.name === "TimeoutError" ? "timed out" : error.message}`);
    }
    if (res.status === 429) {
      const wait = Math.min(Number(res.headers.get("retry-after")) || 5, 30);
      await new Promise((resolve) => setTimeout(resolve, wait * 1000));
      continue;
    }
    if (!res.ok) throw new EverhourError(`${method} ${path} -> ${res.status} ${text.slice(0, 300)}`);
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      throw new EverhourError(`${method} ${path} -> invalid JSON response`);
    }
  }
  throw new EverhourError(`${method} ${path} -> rate limited`);
}

// Accepts 30m, 2h, 1h15m, 1:30, 1.5h, or a bare number of minutes. Returns seconds.
export function parseDuration(input) {
  const s = String(input).trim().toLowerCase();
  let m;
  if ((m = s.match(/^(\d+):([0-5]\d)$/))) return (+m[1] * 60 + +m[2]) * 60;
  if ((m = s.match(/^(?:(\d+(?:\.\d+)?)h)?\s*(?:(\d+)m)?$/)) && (m[1] || m[2]))
    return Math.round((parseFloat(m[1] ?? "0") * 60 + +(m[2] ?? 0)) * 60);
  if (/^\d+$/.test(s)) return +s * 60;
  throw new EverhourError(`Bad duration "${input}". Use 30m, 2h, 1h15m, 1:30, 1.5h, or minutes.`);
}

// Accepts YYYY-MM-DD, today, or yesterday, in local time.
export function parseDate(input = "today") {
  const local = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (input === "today") return local(new Date());
  if (input === "yesterday") {
    const now = new Date();
    return local(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (m && local(new Date(+m[1], +m[2] - 1, +m[3])) === input) return input;
  throw new EverhourError(`Bad date "${input}". Use YYYY-MM-DD, today, or yesterday.`);
}

export function formatTime(seconds) {
  const minutes = Math.round(seconds / 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

export function searchTasks(query, { includeClosed = true, limit = 50 } = {}) {
  const params = new URLSearchParams({ query, limit: String(limit), searchInClosed: String(includeClosed) });
  return api("GET", `/tasks/search?${params}`);
}

// An Everhour id ("li:…", "ev:…", no spaces) is fetched directly; a tracker key such as QA-1049 must equal the task's
// `number`. Anything else must match exactly one task name.
export async function resolveTask(ref) {
  if (/^[a-z]+:\S+$/i.test(ref)) return api("GET", `/tasks/${encodeURIComponent(ref)}`);
  const results = await searchTasks(ref);
  const wanted = ref.trim().toUpperCase();
  const byNumber = results.filter((t) => t.number?.toUpperCase() === wanted);
  const hits = byNumber.length ? byNumber : results.filter((t) => t.name.toUpperCase() === wanted);
  if (hits.length === 1) return hits[0];
  const listing = results
    .slice(0, 10)
    .map((t) => `  ${t.id}  ${t.number ?? ""}  ${t.name}`)
    .join("\n");
  throw new EverhourError(
    `${hits.length ? "Several" : "No"} tasks match "${ref}" exactly. Pass an Everhour task id instead:\n${listing || "  (no results)"}`,
  );
}

// Adds a time record for the current user. Refuses a second entry on the same task and day unless force.
export async function logTime({ task: ref, duration, date: dateArg, comment, dryRun = false, force = false }) {
  const time = parseDuration(duration);
  if (time <= 0) throw new EverhourError("Duration must be positive.");
  const date = parseDate(dateArg);
  const me = await api("GET", "/users/me");
  const task = await resolveTask(ref);
  const label = `${task.number ? `${task.number} ` : ""}"${task.name}"`;

  const records = await api("GET", `/tasks/${encodeURIComponent(task.id)}/time?from=${date}&to=${date}`);
  const already = records.filter((r) => r.user === me.id).reduce((sum, r) => sum + r.time, 0);
  if (already && !force)
    throw new EverhourError(
      `${me.name} already has ${formatTime(already)} on ${label} for ${date}. Use force to add another ${formatTime(time)}.`,
    );

  const summary = `${formatTime(time)} on ${date} to ${label} [${task.id}]${comment ? ` - ${comment}` : ""}`;
  if (dryRun) return `Dry run, nothing logged: would log ${summary}`;
  const record = await api("POST", "/time", { task: task.id, date, time, user: me.id, ...(comment ? { comment } : {}) });
  return `Logged ${summary} (record ${record.id})`;
}
