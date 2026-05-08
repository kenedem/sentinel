// poller.js - Runs periodic checks using SQLite DB
// Multi-node confirmation logic included

const {
  getEndpoints,
  getActiveAgents,
  createLog,
  createIncident,
  getRecentLogs,
} = require('../db/database');

const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between incidents

// Dummy check function (replace with real DNS/TCP/TLS/HTTP later)
async function checkEndpoint(endpoint, agentId) {
  const start = Date.now();

  // Simulate a check: 2% chance to fail
  const success = Math.random() > 0.02;
  const failureStage = success ? null : 'HTTP'; // placeholder
  const responseTime = success
    ? Math.floor(Math.random() * 200) + 20
    : 5000; // simulate failure delay

  return {
    endpointId: endpoint.id,
    nodeId: agentId,
    success,
    failureStage,
    responseTime,
    timestamp: new Date().toISOString(),
  };
}

// Keep track of last alert per endpoint in memory (cooldown)
const lastAlertTime = {};

async function runCheckCycle() {
  // Fetch enabled endpoints and active agents
  getEndpoints(async (err, endpoints) => {
    if (err) return console.error('Error fetching endpoints:', err);
    getActiveAgents(async (err2, agents) => {
      if (err2) return console.error('Error fetching agents:', err2);

      for (const endpoint of endpoints) {
        // Run checks for all agents in parallel
        const checkPromises = agents.map((agent) =>
          checkEndpoint(endpoint, agent.id)
        );

        const results = await Promise.all(checkPromises);

        // Store logs in DB
        results.forEach((result) => {
          createLog(result, (err3) => {
            if (err3) console.error('Failed to create log:', err3);
          });
        });

        // Incident logic
        const failures = results.filter((r) => !r.success);
        const totalNodes = agents.length;
        const failedNodes = failures.length;

        if (failedNodes >= 2) {
          const now = Date.now();
          const lastAlert = lastAlertTime[endpoint.id] || 0;
          if (now - lastAlert > ALERT_COOLDOWN_MS) {
            // Determine dominant failure stage
            const stageCounts = {};
            failures.forEach((f) => {
              const stage = f.failureStage || 'UNKNOWN';
              stageCounts[stage] = (stageCounts[stage] || 0) + 1;
            });
            const dominantStage = Object.entries(stageCounts)
              .sort((a, b) => b[1] - a[1])[0][0];

            // Create incident in DB
            const incident = {
              endpoint_id: endpoint.id,
              created_at: new Date().toISOString(),
              resolved: 0,
            };
            createIncident(incident, (err4) => {
              if (err4) console.error('Failed to create incident:', err4);
            });

            lastAlertTime[endpoint.id] = now;

            console.log(
              `[INCIDENT] ${endpoint.url} failed at ${dominantStage} (${failedNodes}/${totalNodes} agents)`
            );
          }
        } else if (failedNodes === 1) {
          console.log(
            `[WARN] Single agent failure for ${endpoint.url} - not raising incident`
          );
        } else {
          console.log(`[OK] ${endpoint.url} - all agents healthy`);
        }
      }
    });
  });
}

function startPoller(intervalSec = 30) {
  console.log('[POLL] NIACS Poller started - first check running...');
  runCheckCycle();

  setInterval(() => {
    console.log(`\n[POLL] Check cycle at ${new Date().toLocaleTimeString()}`);
    runCheckCycle();
  }, intervalSec * 1000);
}

module.exports = { startPoller, runCheckCycle };