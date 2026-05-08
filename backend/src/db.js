const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const DEFAULT_DB_PATH = path.join(__dirname, "..", "data", "niacs.db");
const DB_PATH = process.env.NIACS_DB_PATH || DEFAULT_DB_PATH;

if (DB_PATH !== ":memory:") {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const sqlite = new DatabaseSync(DB_PATH);
sqlite.exec("PRAGMA foreign_keys = ON");
sqlite.exec("PRAGMA journal_mode = WAL");

const DEFAULT_SETTINGS = {
  simulationEnabled: true,
  defaultIntervalMs: 5000,
  defaultTimeoutMs: 5000,
  alertCooldownMs: 5 * 60 * 1000,
  failureThresholdNodes: 2,
  logRetention: 500,
};

function nowIso() {
  return new Date().toISOString();
}

function nowMs() {
  return Date.now();
}

function boolToInt(value) {
  return value ? 1 : 0;
}

function intToBool(value) {
  return Number(value) === 1;
}

function parseSetting(key, value) {
  if (key === "simulationEnabled") return value === "true";
  return Number(value);
}

function normalizeEndpoint(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    interval: row.interval_ms,
    intervalMs: row.interval_ms,
    timeout: row.timeout_ms,
    timeoutMs: row.timeout_ms,
    enabled: intToBool(row.enabled),
    forceDueAt: row.force_due_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeAgent(row) {
  if (!row) return null;
  const lastSeenMs = row.last_seen_at ? Date.parse(row.last_seen_at) : 0;
  const ageMs = lastSeenMs ? Date.now() - lastSeenMs : null;
  let status = "offline";
  if (lastSeenMs && ageMs <= 30000) status = "online";
  else if (lastSeenMs && ageMs <= 90000) status = "stale";

  return {
    id: row.id,
    name: row.name,
    region: row.region,
    mode: row.mode,
    enabled: intToBool(row.enabled),
    lastSeenAt: row.last_seen_at,
    status,
  };
}

function normalizeLog(row) {
  if (!row) return null;
  return {
    id: row.id,
    checkWindow: row.check_window,
    endpointId: row.endpoint_id,
    endpointUrl: row.endpoint_url,
    endpointName: row.endpoint_name,
    nodeId: row.node_id,
    nodeName: row.node_name,
    nodeRegion: row.node_region,
    nodeMode: row.node_mode,
    timestamp: row.timestamp,
    success: intToBool(row.success),
    failureStage: row.failure_stage,
    httpStatus: row.http_status,
    responseTime: row.response_time,
    errorMessage: row.error_message,
  };
}

function normalizeIncident(row) {
  if (!row) return null;
  return {
    id: row.id,
    endpointId: row.endpoint_id,
    endpointUrl: row.endpoint_url,
    endpointName: row.endpoint_name,
    timestamp: row.timestamp,
    failureStage: row.failure_stage,
    failedNodes: JSON.parse(row.failed_nodes || "[]"),
    totalNodes: row.total_nodes,
    confirmedBy: row.confirmed_by,
    status: row.status,
    resolvedAt: row.resolved_at,
    checkWindow: row.check_window,
  };
}

function initSchema() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS endpoints (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      interval_ms INTEGER NOT NULL,
      timeout_ms INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      force_due_at INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      region TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'real',
      enabled INTEGER NOT NULL DEFAULT 1,
      last_seen_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_jobs (
      agent_id TEXT NOT NULL,
      endpoint_id TEXT NOT NULL,
      check_window TEXT,
      last_assigned_at INTEGER NOT NULL DEFAULT 0,
      last_completed_at INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (agent_id, endpoint_id),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
      FOREIGN KEY (endpoint_id) REFERENCES endpoints(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      check_window TEXT NOT NULL,
      endpoint_id TEXT NOT NULL,
      endpoint_url TEXT NOT NULL,
      endpoint_name TEXT NOT NULL,
      node_id TEXT NOT NULL,
      node_name TEXT NOT NULL,
      node_region TEXT NOT NULL,
      node_mode TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      success INTEGER NOT NULL,
      failure_stage TEXT,
      http_status INTEGER,
      response_time INTEGER,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      endpoint_id TEXT NOT NULL,
      endpoint_url TEXT NOT NULL,
      endpoint_name TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      failure_stage TEXT NOT NULL,
      failed_nodes TEXT NOT NULL,
      total_nodes INTEGER NOT NULL,
      confirmed_by INTEGER NOT NULL,
      status TEXT NOT NULL,
      resolved_at TEXT,
      check_window TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_incidents_endpoint_window
      ON incidents(endpoint_id, check_window);
    CREATE INDEX IF NOT EXISTS idx_logs_endpoint_window
      ON logs(endpoint_id, check_window);
    CREATE INDEX IF NOT EXISTS idx_logs_timestamp
      ON logs(timestamp);
  `);
}

function seedDefaults() {
  const insertSetting = sqlite.prepare(
    "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
  );
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    insertSetting.run(key, String(value));
  }

  const countEndpoints = sqlite.prepare("SELECT COUNT(*) AS count FROM endpoints").get().count;
  if (countEndpoints === 0) {
    const insertEndpoint = sqlite.prepare(`
      INSERT INTO endpoints (id, name, url, interval_ms, timeout_ms, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `);
    const ts = nowIso();
    insertEndpoint.run("ep1", "Google", "https://www.google.com", 5000, 5000, ts, ts);
    insertEndpoint.run("ep2", "GitHub", "https://github.com", 5000, 5000, ts, ts);
    insertEndpoint.run(
      "ep3",
      "Test Failing Service",
      "https://this-does-not-exist-niacs-test.com",
      5000,
      5000,
      ts,
      ts
    );
  }

  const countAgents = sqlite.prepare("SELECT COUNT(*) AS count FROM agents").get().count;
  if (countAgents === 0) {
    const insertAgent = sqlite.prepare(`
      INSERT INTO agents (id, name, region, mode, enabled, created_at, updated_at)
      VALUES (?, ?, ?, 'simulated', 1, ?, ?)
    `);
    const ts = nowIso();
    insertAgent.run("sim-af-west", "Simulated Africa (Accra)", "af-west", ts, ts);
    insertAgent.run("sim-eu-west", "Simulated Europe (London)", "eu-west", ts, ts);
    insertAgent.run("sim-us-east", "Simulated America (New York)", "us-east", ts, ts);
  }
}

function getSettings() {
  const rows = sqlite.prepare("SELECT key, value FROM settings").all();
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) settings[row.key] = parseSetting(row.key, row.value);
  return settings;
}

function updateSettings(patch) {
  const allowed = new Set(Object.keys(DEFAULT_SETTINGS));
  const stmt = sqlite.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  for (const [key, value] of Object.entries(patch)) {
    if (!allowed.has(key)) continue;
    stmt.run(key, String(value));
  }
  return getSettings();
}

function listEndpoints() {
  return sqlite
    .prepare("SELECT * FROM endpoints ORDER BY created_at ASC")
    .all()
    .map(normalizeEndpoint);
}

function getEndpoint(id) {
  return normalizeEndpoint(sqlite.prepare("SELECT * FROM endpoints WHERE id = ?").get(id));
}

function createEndpoint({ name, url, interval, timeout }) {
  const id = `ep${Date.now()}`;
  const ts = nowIso();
  sqlite
    .prepare(`
      INSERT INTO endpoints (id, name, url, interval_ms, timeout_ms, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `)
    .run(id, name, url, interval, timeout, ts, ts);
  return getEndpoint(id);
}

function deleteEndpoint(id) {
  const result = sqlite.prepare("DELETE FROM endpoints WHERE id = ?").run(id);
  return result.changes > 0;
}

function markAllEndpointsDue() {
  sqlite.prepare("UPDATE endpoints SET force_due_at = ?").run(nowMs());
}

function registerAgent({ id, name, region, mode = "real" }) {
  const ts = nowIso();
  sqlite
    .prepare(`
      INSERT INTO agents (id, name, region, mode, enabled, last_seen_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        region = excluded.region,
        mode = excluded.mode,
        enabled = 1,
        last_seen_at = excluded.last_seen_at,
        updated_at = excluded.updated_at
    `)
    .run(id, name, region, mode, ts, ts, ts);
  return getAgent(id);
}

function touchAgent(id) {
  sqlite
    .prepare("UPDATE agents SET last_seen_at = ?, updated_at = ? WHERE id = ?")
    .run(nowIso(), nowIso(), id);
}

function getAgent(id) {
  return normalizeAgent(sqlite.prepare("SELECT * FROM agents WHERE id = ?").get(id));
}

function listAgents({ includeDisabled = false } = {}) {
  const sql = includeDisabled
    ? "SELECT * FROM agents ORDER BY mode ASC, region ASC, name ASC"
    : "SELECT * FROM agents WHERE enabled = 1 ORDER BY mode ASC, region ASC, name ASC";
  return sqlite.prepare(sql).all().map(normalizeAgent);
}

function listAgentsByMode(mode) {
  return sqlite
    .prepare("SELECT * FROM agents WHERE enabled = 1 AND mode = ? ORDER BY region ASC")
    .all(mode)
    .map(normalizeAgent);
}

function buildCheckWindow(endpoint, at = nowMs()) {
  return `${endpoint.id}:${Math.floor(at / endpoint.intervalMs)}`;
}

function getDueJobsForAgent(agentId, at = nowMs()) {
  const agent = getAgent(agentId);
  if (!agent || !agent.enabled) return [];

  const endpoints = listEndpoints().filter((ep) => ep.enabled);
  const upsert = sqlite.prepare(`
    INSERT INTO agent_jobs (agent_id, endpoint_id, check_window, last_assigned_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(agent_id, endpoint_id) DO UPDATE SET
      check_window = excluded.check_window,
      last_assigned_at = excluded.last_assigned_at
  `);
  const getJob = sqlite.prepare(
    "SELECT * FROM agent_jobs WHERE agent_id = ? AND endpoint_id = ?"
  );

  const jobs = [];
  for (const endpoint of endpoints) {
    const existing = getJob.get(agentId, endpoint.id);
    const forceDue = endpoint.forceDueAt && endpoint.forceDueAt > (existing?.last_assigned_at || 0);
    const intervalDue = !existing || at - existing.last_assigned_at >= endpoint.intervalMs;
    if (!forceDue && !intervalDue) continue;

    const checkWindow = buildCheckWindow(endpoint, at);
    upsert.run(agentId, endpoint.id, checkWindow, at);
    jobs.push({
      checkWindow,
      endpoint: {
        id: endpoint.id,
        name: endpoint.name,
        url: endpoint.url,
        interval: endpoint.interval,
        intervalMs: endpoint.intervalMs,
        timeout: endpoint.timeout,
        timeoutMs: endpoint.timeoutMs,
      },
    });
  }

  touchAgent(agentId);
  return jobs;
}

function recordResult(agentId, rawResult) {
  const agent = getAgent(agentId);
  const endpoint = getEndpoint(rawResult.endpointId);
  if (!agent || !endpoint) return null;

  const timestamp = rawResult.timestamp || nowIso();
  const checkWindow = rawResult.checkWindow || buildCheckWindow(endpoint, Date.parse(timestamp));
  const result = {
    checkWindow,
    endpointId: endpoint.id,
    endpointUrl: endpoint.url,
    endpointName: endpoint.name,
    nodeId: agent.id,
    nodeName: agent.name,
    nodeRegion: agent.region,
    nodeMode: agent.mode,
    timestamp,
    success: Boolean(rawResult.success),
    failureStage: rawResult.failureStage || null,
    httpStatus: rawResult.httpStatus || null,
    responseTime: rawResult.responseTime || null,
    errorMessage: rawResult.errorMessage || null,
  };

  const insert = sqlite.prepare(`
    INSERT INTO logs (
      check_window, endpoint_id, endpoint_url, endpoint_name, node_id, node_name,
      node_region, node_mode, timestamp, success, failure_stage, http_status,
      response_time, error_message
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = insert.run(
    result.checkWindow,
    result.endpointId,
    result.endpointUrl,
    result.endpointName,
    result.nodeId,
    result.nodeName,
    result.nodeRegion,
    result.nodeMode,
    result.timestamp,
    boolToInt(result.success),
    result.failureStage,
    result.httpStatus,
    result.responseTime,
    result.errorMessage
  );

  sqlite
    .prepare(
      "UPDATE agent_jobs SET last_completed_at = ? WHERE agent_id = ? AND endpoint_id = ?"
    )
    .run(nowMs(), agentId, endpoint.id);
  touchAgent(agentId);
  trimLogs();

  return normalizeLog(sqlite.prepare("SELECT * FROM logs WHERE id = ?").get(info.lastInsertRowid));
}

function trimLogs() {
  const { logRetention } = getSettings();
  sqlite
    .prepare(`
      DELETE FROM logs
      WHERE id NOT IN (
        SELECT id FROM logs ORDER BY id DESC LIMIT ?
      )
    `)
    .run(logRetention);
}

function listLogs({ limit = 100, endpointId } = {}) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 500));
  if (endpointId) {
    return sqlite
      .prepare("SELECT * FROM logs WHERE endpoint_id = ? ORDER BY id DESC LIMIT ?")
      .all(endpointId, safeLimit)
      .map(normalizeLog);
  }
  return sqlite
    .prepare("SELECT * FROM logs ORDER BY id DESC LIMIT ?")
    .all(safeLimit)
    .map(normalizeLog);
}

function countLogs(endpointId) {
  if (endpointId) {
    return sqlite.prepare("SELECT COUNT(*) AS count FROM logs WHERE endpoint_id = ?").get(endpointId).count;
  }
  return sqlite.prepare("SELECT COUNT(*) AS count FROM logs").get().count;
}

function getWindowLogs(endpointId, checkWindow) {
  return sqlite
    .prepare("SELECT * FROM logs WHERE endpoint_id = ? AND check_window = ? ORDER BY id DESC")
    .all(endpointId, checkWindow)
    .map(normalizeLog);
}

function listIncidents() {
  return sqlite
    .prepare("SELECT * FROM incidents ORDER BY created_at DESC")
    .all()
    .map(normalizeIncident);
}

function incidentExists(endpointId, checkWindow) {
  return Boolean(
    sqlite
      .prepare("SELECT 1 FROM incidents WHERE endpoint_id = ? AND check_window = ?")
      .get(endpointId, checkWindow)
  );
}

function getLastIncidentTime(endpointId) {
  const row = sqlite
    .prepare("SELECT created_at FROM incidents WHERE endpoint_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(endpointId);
  return row ? Date.parse(row.created_at) : 0;
}

function createIncident({
  endpoint,
  checkWindow,
  failureStage,
  failedNodes,
  totalNodes,
  confirmedBy,
}) {
  const ts = nowIso();
  const id = `inc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  sqlite
    .prepare(`
      INSERT INTO incidents (
        id, endpoint_id, endpoint_url, endpoint_name, timestamp, failure_stage,
        failed_nodes, total_nodes, confirmed_by, status, check_window, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
    `)
    .run(
      id,
      endpoint.id,
      endpoint.url,
      endpoint.name,
      ts,
      failureStage,
      JSON.stringify(failedNodes),
      totalNodes,
      confirmedBy,
      checkWindow,
      ts
    );
  return normalizeIncident(sqlite.prepare("SELECT * FROM incidents WHERE id = ?").get(id));
}

function resolveIncident(id, status = "resolved") {
  sqlite
    .prepare("UPDATE incidents SET status = ?, resolved_at = ? WHERE id = ?")
    .run(status, nowIso(), id);
  return normalizeIncident(sqlite.prepare("SELECT * FROM incidents WHERE id = ?").get(id));
}

function resetForTests() {
  sqlite.exec(`
    DELETE FROM logs;
    DELETE FROM incidents;
    DELETE FROM agent_jobs;
    DELETE FROM agents;
    DELETE FROM endpoints;
    DELETE FROM settings;
  `);
  seedDefaults();
}

initSchema();
seedDefaults();

module.exports = {
  sqlite,
  DEFAULT_SETTINGS,
  getSettings,
  updateSettings,
  listEndpoints,
  getEndpoint,
  createEndpoint,
  deleteEndpoint,
  markAllEndpointsDue,
  registerAgent,
  touchAgent,
  getAgent,
  listAgents,
  listAgentsByMode,
  getDueJobsForAgent,
  recordResult,
  listLogs,
  countLogs,
  getWindowLogs,
  listIncidents,
  incidentExists,
  getLastIncidentTime,
  createIncident,
  resolveIncident,
  resetForTests,
};
