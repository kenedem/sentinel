// routes/api.js - All REST API endpoints for the dashboard

const express = require("express");
const router = express.Router();
const db = require("../db");
const { runCheckCycle } = require("../monitors/poller");
const { detectAnomalies } = require("../monitors/anomaly");
// GET /api/status
router.get("/status", (req, res) => {
  const endpoints = db.endpoints.map((ep) => {
    const recentLogs = db.logs
      .filter((l) => l.endpointId === ep.id)
      .slice(0, db.nodes.length * 3);

    const latestPerNode = {};
    recentLogs.forEach((log) => {
      if (!latestPerNode[log.nodeId]) latestPerNode[log.nodeId] = log;
    });

    const nodeResults = Object.values(latestPerNode);
    const failedCount = nodeResults.filter((n) => !n.success).length;
    const totalChecked = nodeResults.length;

    let overallStatus = "unknown";
    if (totalChecked === 0) overallStatus = "unknown";
    else if (failedCount === 0) overallStatus = "healthy";
    else if (failedCount >= 2) overallStatus = "down";
    else overallStatus = "degraded";

    const times = nodeResults.filter((n) => n.responseTime).map((n) => n.responseTime);
    const avgResponseTime =
      times.length > 0
        ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
        : null;

    const last50 = db.logs.filter((l) => l.endpointId === ep.id).slice(0, 50);
    const successCount = last50.filter((l) => l.success).length;
    const uptime =
      last50.length > 0
        ? ((successCount / last50.length) * 100).toFixed(1)
        : "N/A";

    return { ...ep, status: overallStatus, avgResponseTime, uptime, nodeResults };
  });

  const openIncidents = db.incidents.filter((i) => i.status === "open").length;

  res.json({
    summary: {
      total: endpoints.length,
      healthy: endpoints.filter((e) => e.status === "healthy").length,
      down: endpoints.filter((e) => e.status === "down").length,
      degraded: endpoints.filter((e) => e.status === "degraded").length,
      openIncidents,
    },
    endpoints,
    nodes: db.nodes,
  });
});

// GET /api/logs
router.get("/logs", (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const endpointId = req.query.endpointId;
  let logs = db.logs;
  if (endpointId) logs = logs.filter((l) => l.endpointId === endpointId);
  res.json({ logs: logs.slice(0, limit), total: logs.length });
});

// GET /api/incidents
router.get("/incidents", (req, res) => {
  res.json({ incidents: db.incidents });
});

// PATCH /api/incidents/:id
router.patch("/incidents/:id", (req, res) => {
  const incident = db.incidents.find((i) => i.id === req.params.id);
  if (!incident) return res.status(404).json({ error: "Incident not found" });
  incident.status = req.body.status || "resolved";
  incident.resolvedAt = new Date().toISOString();
  res.json({ incident });
});

// GET /api/endpoints
router.get("/endpoints", (req, res) => {
  res.json({ endpoints: db.endpoints });
});

// POST /api/endpoints
router.post("/endpoints", (req, res) => {
  const { name, url, interval, timeout } = req.body;
  if (!name || !url) return res.status(400).json({ error: "name and url are required" });
  const newEndpoint = {
    id: `ep${Date.now()}`,
    name,
    url,
    interval: interval || 30000,
    timeout: timeout || 5000,
    enabled: true,
  };
  db.endpoints.push(newEndpoint);
  res.status(201).json({ endpoint: newEndpoint });
});

// DELETE /api/endpoints/:id
router.delete("/endpoints/:id", (req, res) => {
  const index = db.endpoints.findIndex((e) => e.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Endpoint not found" });
  db.endpoints.splice(index, 1);
  res.json({ message: "Endpoint deleted" });
});

// POST /api/check-now
router.post("/check-now", async (req, res) => {
  await runCheckCycle();
  res.json({ message: "Check cycle completed", timestamp: new Date().toISOString() });
});

// GET /api/nodes
router.get("/nodes", (req, res) => {
  res.json({ nodes: db.nodes });
});
// GET /api/anomalies
router.get("/anomalies", (req, res) => {
  const anomalies = detectAnomalies();
  res.json({ anomalies });
});
module.exports = router;