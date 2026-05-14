// backend/agent/agent.js
require('dotenv').config();
const fetch = require('node-fetch'); // Ensure node-fetch@2 is installed
const { setTimeout } = require('timers/promises');

const BASE_URL = process.env.NIACS_API_BASE || 'http://localhost:3001';
const AGENT_ID = process.env.NIACS_AGENT_ID || 'local-agent-1';
const AGENT_NAME = process.env.NIACS_AGENT_NAME || 'Local Agent 1';
const AGENT_REGION = process.env.NIACS_AGENT_REGION || 'us-east';
const AGENT_TOKEN = process.env.NIACS_AGENT_TOKEN || 'supersecrettoken';

const RETRY_INTERVAL_MS = 5000;  // Retry registration every 5s
const POLL_INTERVAL_MS = 30000;  // Poll endpoints every 30s

// --- Register agent ---
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

// --- Fetch endpoints ---
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

// --- Check endpoint ---
async function checkEndpoint(ep) {
  const start = Date.now();
  let status = 'Failed';
  let responseTime = 0;

  try {
    const r = await fetch(ep.url, { method: ep.method });
    responseTime = Date.now() - start;
    status = r.status === 200 ? 'Healthy' : 'Failed';
    console.log(`[CHECK] ${ep.url} -> ${status} (${r.status})`);
  } catch (err) {
    responseTime = Date.now() - start;
    console.log(`[CHECK] ${ep.url} -> Failed (Network error)`);
  }

  // Report to backend
  try {
    await fetch(`${BASE_URL}/api/agents/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: AGENT_ID,
        endpointId: ep.id,
        status,
        responseTime,
        failureStage: status === 'Healthy' ? null : 'UNKNOWN',
      }),
    });
  } catch (err) {
    console.error('[AGENT] Failed to report result:', err.message);
  }
}

// --- Poll all endpoints ---
async function pollEndpoints() {
  const endpoints = await fetchEndpoints();
  if (!endpoints.length) {
    console.log('[AGENT] No endpoints to poll.');
    return;
  }

  for (const ep of endpoints) {
    await checkEndpoint(ep);
  }
}

// --- Start agent ---
async function startAgent() {
  console.log('[AGENT] NIACS Agent starting...');

  let registered = false;
  while (!registered) {
    registered = await registerAgent();
    if (!registered) {
      console.log(`[AGENT] Retry registration in ${RETRY_INTERVAL_MS / 1000}s...`);
      await setTimeout(RETRY_INTERVAL_MS);
    }
  }

  console.log('[AGENT] Agent is now active.');

  // First poll immediately
  await pollEndpoints();

  // Schedule repeated polling
  setInterval(pollEndpoints, POLL_INTERVAL_MS);
}

// Start the agent
startAgent();