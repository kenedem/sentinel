// poller.js - Runs periodic checks across all nodes
// This is where the multi-node confirmation logic lives

const { checkEndpoint } = require("./checker");
const db = require("../db");

const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between alerts

async function runCheckCycle() {
  const enabledEndpoints = db.endpoints.filter((ep) => ep.enabled);

  for (const endpoint of enabledEndpoints) {
    // All nodes check this endpoint in parallel
    const checkPromises = db.nodes.map((node) =>
      checkEndpoint(endpoint, node.id)
    );

    const results = await Promise.all(checkPromises);

    // Save all logs
    results.forEach((result) => {
      db.logs.unshift(result);
    });

    // Keep logs manageable
    if (db.logs.length > 500) {
      db.logs = db.logs.slice(0, 500);
    }

    // ── Multi-Node Confirmation Logic ──────────────────────
    const failures = results.filter((r) => !r.success);
    const totalNodes = db.nodes.length;
    const failedNodes = failures.length;

    if (failedNodes >= 2) {
      // Two or more nodes agree — this is a REAL incident
      const now = Date.now();
      const lastAlert = db.lastAlertTime[endpoint.id] || 0;
      const cooldownPassed = now - lastAlert > ALERT_COOLDOWN_MS;

      if (cooldownPassed) {
        const stageCounts = {};
        failures.forEach((f) => {
          const stage = f.failureStage || "UNKNOWN";
          stageCounts[stage] = (stageCounts[stage] || 0) + 1;
        });
        const dominantStage = Object.entries(stageCounts)
          .sort((a, b) => b[1] - a[1])[0][0];

        const incident = {
          id: `inc-${Date.now()}`,
          endpointId: endpoint.id,
          endpointUrl: endpoint.url,
          endpointName: db.endpoints.find((e) => e.id === endpoint.id)?.name || endpoint.url,
          timestamp: new Date().toISOString(),
          failureStage: dominantStage,
          failedNodes: failures.map((f) => f.nodeId),
          totalNodes: totalNodes,
          confirmedBy: failedNodes,
          status: "open",
          logs: failures,
        };

        db.incidents.unshift(incident);
        db.lastAlertTime[endpoint.id] = now;

        console.log(
          `🚨 INCIDENT: ${endpoint.name} failed at ${dominantStage} (${failedNodes}/${totalNodes} nodes)`
        );
      }
    } else if (failedNodes === 1) {
      console.log(
        `⚠️  Single node failure for ${endpoint.name} — not raising incident`
      );
    } else {
      console.log(`✅ ${endpoint.name} — all nodes healthy`);
    }
  }
}

function startPoller() {
  console.log("🔄 NIACS Poller started — running first check...");
  runCheckCycle();

  setInterval(() => {
    console.log(`\n⏰ Check cycle at ${new Date().toLocaleTimeString()}`);
    runCheckCycle();
  }, 30000);
}

module.exports = { startPoller, runCheckCycle };