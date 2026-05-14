require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3001;
const AGENT_TOKEN = process.env.NIACS_AGENT_TOKEN || 'supersecrettoken';

app.use(cors());
app.use(bodyParser.json());

// --- Routes ---
app.get('/', (req, res) => res.send('NIACS Backend is running'));

// Register agent
app.post('/api/agents/register', async (req, res) => {
  const { agentId, agentName, agentRegion, token } = req.body;
  if (!agentId || !agentName || !agentRegion || !token) return res.status(400).json({ error: 'Missing fields' });
  if (token !== AGENT_TOKEN) return res.status(401).json({ error: 'Invalid token' });

  try {
    await db.registerAgent({ id: agentId, name: agentName, region: agentRegion, enabled: 1 });
    console.log(`[AGENT] Registered: ${agentName} (${agentId}) in ${agentRegion}`);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// List active agents
app.get('/api/agents', async (req, res) => {
  try {
    const agents = await db.getActiveAgents();
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Get endpoints for agent polling
app.get('/api/endpoints', async (req, res) => {
  try {
    const endpoints = await db.getEndpoints();
    res.json(endpoints);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Receive agent results
app.post('/api/agents/results', async (req, res) => {
  const { agentId, endpointId, status, responseTime } = req.body;
  if (!agentId || !endpointId || status === undefined || responseTime === undefined)
    return res.status(400).json({ error: 'Missing required fields' });

  try {
    await db.createLog({ agent_id: agentId, endpoint_id: endpointId, timestamp: new Date().toISOString(), status, response_time: responseTime });
    console.log(`[RESULT] Agent ${agentId} reported ${status} on endpoint ${endpointId} (${responseTime}ms)`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`NIACS backend running on http://localhost:${PORT}`));
}

module.exports = app;