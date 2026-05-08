const express = require('express');
const router = express.Router();

// Temporary in-memory store for demo
const agents = [];

// POST /api/agents/register
router.post('/register', (req, res) => {
    const { id, name, region } = req.body;
    if (!id || !name || !region) return res.status(400).json({ error: 'Missing fields' });

    // Check if agent already exists
    const existing = agents.find(a => a.id === id);
    if (existing) {
        existing.lastSeenAt = new Date().toISOString();
        return res.status(200).json(existing);
    }

    const agent = { id, name, region, lastSeenAt: new Date().toISOString() };
    agents.push(agent);

    console.log(`[BACKEND] Registered agent: ${name} (${id})`);
    res.status(201).json(agent);
});

module.exports = router;