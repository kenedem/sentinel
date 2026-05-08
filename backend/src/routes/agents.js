// backend/agent/agent.js
require('dotenv').config();  // Load .env
const fetch = require('node-fetch'); // Make sure node-fetch@2 is installed

// Agent config from environment
const BASE_URL = process.env.NIACS_API_BASE || 'http://localhost:3001';
const AGENT_ID = process.env.NIACS_AGENT_ID || 'agent-1';
const AGENT_NAME = process.env.NIACS_AGENT_NAME || 'Local Agent 1';
const AGENT_REGION = process.env.NIACS_AGENT_REGION || 'us-east';
const AGENT_TOKEN = process.env.NIACS_AGENT_TOKEN || 'my-secret-token';

// How often to retry registration on failure (ms)
const RETRY_INTERVAL = 5000;

async function registerAgent() {
  try {
    const res = await fetch(`${BASE_URL}/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: AGENT_ID,
        agentName: AGENT_NAME,
        agentRegion: AGENT_REGION,
        token: AGENT_TOKEN
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

async function startAgent() {
  console.log('[AGENT] NIACS Agent starting...');

  let registered = false;
  while (!registered) {
    registered = await registerAgent();
    if (!registered) {
      console.log(`[AGENT] Retry registration in ${RETRY_INTERVAL / 1000}s...`);
      await new Promise(r => setTimeout(r, RETRY_INTERVAL));
    }
  }

  console.log('[AGENT] Agent ready for monitoring jobs...');
  // TODO: Start polling backend for jobs once implemented
}

startAgent();