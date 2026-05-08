require('dotenv').config();           // Load .env variables
const fetch = require('node-fetch');  // node-fetch v2
const { setTimeout } = require('timers/promises');

const BASE_URL = process.env.NIACS_API_BASE || 'http://localhost:3001';
const AGENT_ID = process.env.NIACS_AGENT_ID || 'local-agent-1';
const AGENT_NAME = process.env.NIACS_AGENT_NAME || 'Local Agent 1';
const AGENT_REGION = process.env.NIACS_AGENT_REGION || 'us-east';
const AGENT_TOKEN = process.env.NIACS_AGENT_TOKEN || 'supersecrettoken';

const RETRY_INTERVAL_MS = 5000;  // Retry registration every 5s
const POLL_INTERVAL_MS = 30000;  // Poll endpoints every 30s

// Register agent with backend
async function registerAgent() {
  try {
    const res = await fetch(`${BASE_URL}/api/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: AGENT_ID,
        agentName: AGENT_NAME,
        agentRegion: AGENT_REGION,
        token: AGENT_TOKEN,
      }),
    });
    if (!res.ok) throw new Error(`Registration failed: ${res.status} ${res.statusText}`);
    const data = await res.json();
    console.log('[AGENT] Registered successfully:', data);
    return true;
  } catch (err) {
    console.error('[AGENT] Registration error:', err.message);
    return false;
  }
}

// Fetch endpoints from backend
async function fetchEndpoints() {
  try {
    const res = await fetch(`${BASE_URL}/api/endpoints`);
    if (!res.ok) throw new Error(`Failed to fetch endpoints: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[AGENT] Fetch endpoints error:', err.message);
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

    // Submit result
    await fetch(`${BASE_URL}/api/agents/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: AGENT_ID,
        endpointId: ep.id,
        status,
        responseTime: duration,
      }),
    });

  } catch (err) {
    console.log(`[CHECK] ${ep.url} -> Failed (Network error)`);
  }
}

// Poll all endpoints
async function pollEndpoints() {
  const endpoints = await fetchEndpoints();
  for (const ep of endpoints) {
    await checkEndpoint(ep);
  }
}

// Start agent loop
async function startAgent() {
  console.log('[AGENT] NIACS Agent starting...');
  let registered = await registerAgent();
  while (!registered) {
    console.log(`[AGENT] Will retry registration in ${RETRY_INTERVAL_MS / 1000}s...`);
    await setTimeout(RETRY_INTERVAL_MS);
    registered = await registerAgent();
  }
  console.log('[AGENT] Agent is now active.');

  // Run first poll immediately
  await pollEndpoints();

  // Schedule repeated polling
  setInterval(pollEndpoints, POLL_INTERVAL_MS);
}

startAgent();