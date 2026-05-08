// src/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../niacs.db');
const db = new sqlite3.Database(dbPath);

// Initialize tables
db.serialize(() => {
  // Endpoints
  db.run(`CREATE TABLE IF NOT EXISTS endpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'GET',
    check_interval_sec INTEGER NOT NULL DEFAULT 30,
    enabled INTEGER NOT NULL DEFAULT 1
  )`);

  // Agents
  db.run(`CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1
  )`);

  // Logs
  db.run(`CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint_id INTEGER NOT NULL,
    agent_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    status TEXT NOT NULL,
    response_time INTEGER NOT NULL,
    failure_stage TEXT,
    FOREIGN KEY(endpoint_id) REFERENCES endpoints(id),
    FOREIGN KEY(agent_id) REFERENCES agents(id)
  )`);

  // Incidents
  db.run(`CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    resolved INTEGER NOT NULL DEFAULT 0,
    failed_nodes TEXT,       -- JSON array of agent IDs
    failure_stage TEXT
  )`);
});

// ------------------ Promisified DB functions ------------------

// Endpoints
function getEndpoints() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM endpoints WHERE enabled = 1', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function createEndpoint({ url, method, check_interval_sec, enabled }) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO endpoints (url, method, check_interval_sec, enabled) VALUES (?, ?, ?, ?)`,
      [url, method, check_interval_sec, enabled ? 1 : 0],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

// Logs
function createLog({ endpoint_id, agent_id, timestamp, status, response_time, failure_stage }) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO logs (endpoint_id, agent_id, timestamp, status, response_time, failure_stage)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [endpoint_id, agent_id, timestamp, status, response_time, failure_stage || null],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function getRecentLogs(limit = 100) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?`,
      [limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

// Agents
function registerAgent({ id, name, region, enabled }) {
  const last_seen_at = new Date().toISOString();
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO agents (id, name, region, last_seen_at, enabled)
       VALUES (?, ?, ?, ?, ?)`,
      [id, name, region, last_seen_at, enabled ? 1 : 0],
      function(err) {
        if (err) reject(err);
        else resolve(id);
      }
    );
  });
}

function getActiveAgents() {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM agents WHERE enabled = 1`, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Incidents
function createIncident({ endpoint_id, created_at, resolved = 0, failed_nodes = [], failure_stage = null }) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO incidents (endpoint_id, created_at, resolved, failed_nodes, failure_stage)
       VALUES (?, ?, ?, ?, ?)`,
      [endpoint_id, created_at, resolved, JSON.stringify(failed_nodes), failure_stage],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function getIncidents() {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM incidents ORDER BY created_at DESC`, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Export
module.exports = {
  db,
  getEndpoints,
  createEndpoint,
  createLog,
  getRecentLogs,
  registerAgent,
  getActiveAgents,
  createIncident,
  getIncidents,
};