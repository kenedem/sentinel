require('dotenv').config();           // Load .env variables
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// --- In-memory stores for demo ---
const AGENT_TOKEN = process.env.NIACS_AGENT_TOKEN || 'supersecrettoken';
const agents = {}; // id => { name, region, lastSeen }
const endpoints = [
  { id: 'ep1', url: 'https://example.com', method: 'GET', enabled: true },
  { id: 'ep2', url: 'https://httpbin.org/status/200', method: 'GET', enabled: true },
];
const logs = [];
const incidents = [];

// --- Routes ---

// Health check
app.get('/', (req, res) => res.send('NIACS Backend is running'));

// Agent registration
app.post('/api/agents/register', (req, res) => {
  const { agentId, agentName, agentRegion, token } = req.body;

  if (!agentId || !agentName || !agentRegion || !token) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  if (token !== AGENT_TOKEN) return res.status(401).json({ error: 'Invalid token' });

  agents[agentId] = { name: agentName, region: agentRegion, lastSeen: new Date().toISOString() };
  console.log(`[AGENT] Registered: ${agentName} (${agentId}) in ${agentRegion}`);
  res.json({ success: true });
});

// Agent results submission
app.post('/api/agents/results', (req, res) => {
  const { agentId, endpointId, status, responseTime, failureStage } = req.body;
  if (!agentId || !endpointId || status === undefined || responseTime === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  logs.push({
    agent_id: agentId,
    endpoint_id: endpointId,
    timestamp: new Date().toISOString(),
    status,
    response_time: responseTime,
    failure_stage: failureStage || null,
  });

  console.log(`[RESULT] Agent ${agentId} reported ${status} on endpoint ${endpointId} (${responseTime}ms)`);
  res.json({ success: true });
});

// List endpoints
app.get('/api/endpoints', (req, res) => res.json(endpoints.filter(ep => ep.enabled)));

// List all agents
app.get('/api/agents', (req, res) => res.json(agents));

// List recent logs
app.get('/api/logs', (req, res) => res.json(logs.slice(-100)));

// Start server
app.listen(PORT, () => console.log(`NIACS backend running on http://localhost:${PORT}`));