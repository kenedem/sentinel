// agent.js
require('dotenv').config();
const fetch = require('node-fetch'); // Ensure node-fetch@2
const { setTimeout } = require('timers/promises');

const BASE_URL = process.env.NIACS_API_BASE || 'http://localhost:3001';
const AGENT_ID = process.env.NIACS_AGENT_ID || 'local-agent-1';
const AGENT_NAME = process.env.NIACS_AGENT_NAME || 'Local Agent 1';
const AGENT_REGION = process.env.NIACS_AGENT_REGION || 'us-east';
const AGENT_TOKEN = process.env.NIACS_AGENT_TOKEN || 'supersecrettoken';

const RETRY_INTERVAL = 5000;   // Retry registration every 5s
const POLL_INTERVAL = 30000;   // Poll endpoints every 30s

// Register agent
async function registerAgent() {
  try {
    const res = await fetch(`${BASE_URL}/api/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: AGENT_ID, agentName: AGENT_NAME, agentRegion: AGENT_REGION, token: AGENT_TOKEN }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[AGENT] Registration failed: ${res.status} ${res.statusText}`, text);
      return false;
    }

    const data = await res.json();
    if (data.success) {
      console.log(`[AGENT] Registered successfully: ${AGENT_NAME} (${AGENT_ID})`);
      return true;
    }
    console.error('[AGENT] Unexpected response:', data);
    return false;
  } catch (err) {
    console.error('[AGENT] Exception while registering agent:', err.message);
    return false;
  }
}

// Fetch endpoints from backend
async function fetchEndpoints() {
  try {
    const res = await fetch(`${BASE_URL}/api/endpoints`);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.error('[AGENT] Failed to fetch endpoints:', err.message);
    return [];
  }
}

// Check a single endpoint
async function checkEndpoint(ep) {
  const start = Date.now();
  try {
    const r = await fetch(ep.url, { method: ep.method });
    const duration = Date.now() - start;
    const status = r.status === 200 ? 'Healthy' : 'Failed';
    console.log(`[CHECK] ${ep.url} -> ${status} (${r.status})`);

    // Report back to backend
    await fetch(`${BASE_URL}/api/agents/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: AGENT_ID, endpointId: ep.id, status, responseTime: duration }),
    });

  } catch (err) {
    const duration = Date.now() - start;
    console.log(`[CHECK] ${ep.url} -> Failed (Network error)`);
  }
}

// Poll all endpoints
async function pollEndpoints() {
  const endpoints = await fetchEndpoints();
  if (!endpoints.length) return console.log('[AGENT] No endpoints to poll.');
  for (const ep of endpoints) await checkEndpoint(ep);
}

// Start agent loop
async function startAgent() {
  console.log('[AGENT] NIACS Agent starting...');
  let registered = false;

  while (!registered) {
    registered = await registerAgent();
    if (!registered) {
      console.log(`[AGENT] Will retry registration in ${RETRY_INTERVAL / 1000}s...`);
      await setTimeout(RETRY_INTERVAL);
    }
  }

  console.log('[AGENT] Agent is now active.');
  await pollEndpoints();
  setInterval(pollEndpoints, POLL_INTERVAL);
}

startAgent();