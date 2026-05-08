// anomaly.js - Network Anomaly Detection Engine
// Detects unusual patterns: DoS indicators, response spikes, failure surges

const db = require("../db");

const SPIKE_MULTIPLIER = 3;
const SURGE_FAILURE_RATE = 0.5;
const MIN_CHECKS = 3;

function detectAnomalies() {
  const anomalies = [];
  const now = new Date().toISOString();

  for (const endpoint of db.endpoints) {
    const endpointLogs = db.logs
      .filter((l) => l.endpointId === endpoint.id)
      .slice(0, 30);

    if (endpointLogs.length < MIN_CHECKS) continue;

    const successLogs = endpointLogs.filter((l) => l.success && l.responseTime);
    if (successLogs.length >= MIN_CHECKS) {
      const avgResponse =
        successLogs.reduce((sum, l) => sum + l.responseTime, 0) / successLogs.length;
      const latest = successLogs[0];

      if (latest.responseTime > avgResponse * SPIKE_MULTIPLIER) {
        anomalies.push({
          type: "Response Time Spike",
          severity: latest.responseTime > avgResponse * 5 ? "high" : "medium",
          endpointId: endpoint.id,
          endpointName: endpoint.name,
          endpointUrl: endpoint.url,
          description: `Response time suddenly ${Math.round(latest.responseTime / avgResponse)}x higher than average. This may indicate server overload or a potential DoS attack slowing responses.`,
          value: `${latest.responseTime}ms`,
          threshold: `${Math.round(avgResponse)}ms avg`,
          timestamp: now,
        });
      }
    }

    const recentLogs = endpointLogs.slice(0, 9);
    const failureRate = recentLogs.filter((l) => !l.success).length / recentLogs.length;

    if (failureRate >= SURGE_FAILURE_RATE) {
      const severity = failureRate >= 0.8 ? "high" : "medium";
      anomalies.push({
        type: "Failure Rate Surge",
        severity,
        endpointId: endpoint.id,
        endpointName: endpoint.name,
        endpointUrl: endpoint.url,
        description: `${Math.round(failureRate * 100)}% of recent checks failed across nodes. A sudden surge in failures can indicate a DoS attack, network congestion, or server crash.`,
        value: `${Math.round(failureRate * 100)}% failure rate`,
        threshold: `>${Math.round(SURGE_FAILURE_RATE * 100)}% triggers alert`,
        timestamp: now,
      });
    }

    const dnsFailures = endpointLogs.filter((l) => l.failureStage === "DNS");
    if (dnsFailures.length >= 2) {
      anomalies.push({
        type: "DNS Anomaly Detected",
        severity: dnsFailures.length >= 4 ? "high" : "medium",
        endpointId: endpoint.id,
        endpointName: endpoint.name,
        endpointUrl: endpoint.url,
        description: `${dnsFailures.length} DNS failures detected recently. Repeated DNS failures can indicate DNS spoofing, cache poisoning, or DNS server attacks - common in phishing campaigns.`,
        value: `${dnsFailures.length} DNS failures`,
        threshold: "2+ DNS failures triggers alert",
        timestamp: now,
      });
    }

    const latestRound = endpointLogs.slice(0, db.nodes.length);
    const nodeResults = {};
    latestRound.forEach((l) => {
      nodeResults[l.nodeId] = l.success;
    });

    const values = Object.values(nodeResults);
    const hasDisagreement =
      values.length > 1 &&
      values.some((v) => v === true) &&
      values.some((v) => v === false);

    if (hasDisagreement) {
      anomalies.push({
        type: "Node Disagreement",
        severity: "low",
        endpointId: endpoint.id,
        endpointName: endpoint.name,
        endpointUrl: endpoint.url,
        description: "Monitoring nodes are reporting conflicting results for this endpoint. One node sees it as up while another sees it as down. This may indicate regional network issues or routing anomalies.",
        value: `Mixed results across ${values.length} nodes`,
        threshold: "Any disagreement triggers alert",
        timestamp: now,
      });
    }
  }

  return anomalies;
}

module.exports = { detectAnomalies };
