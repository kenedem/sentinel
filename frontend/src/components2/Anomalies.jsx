export default function Anomalies({ anomalies }) {
  const high = anomalies.filter((a) => a.severity === "high");
  const medium = anomalies.filter((a) => a.severity === "medium");
  const low = anomalies.filter((a) => a.severity === "low");

  const AnomalyCard = ({ anomaly }) => (
    <div className={`anomaly-card ${anomaly.severity}`}>
      <div className="anomaly-header">
        <div>
          <div className="anomaly-type">
            {anomaly.severity === "high" ? "🔴" : anomaly.severity === "medium" ? "🟡" : "🔵"}{" "}
            {anomaly.type}
          </div>
          <div className="anomaly-endpoint">{anomaly.endpointName} — {anomaly.endpointUrl}</div>
        </div>
        <span className={`severity-badge severity-${anomaly.severity}`}>
          {anomaly.severity.toUpperCase()}
        </span>
      </div>
      <div className="anomaly-details">{anomaly.description}</div>
      <div className="anomaly-meta">
        <span>🕒 {new Date(anomaly.timestamp).toLocaleString()}</span>
        {anomaly.value && <span>📊 Measured: {anomaly.value}</span>}
        {anomaly.threshold && <span>⚠️ Threshold: {anomaly.threshold}</span>}
      </div>
    </div>
  );

  return (
    <div className="anomalies-page">
      <h2>🔍 Network Anomaly Detection</h2>
      <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
        Sentinel continuously analyses response patterns across all nodes to detect unusual behaviour
        — including potential DoS indicators, response time spikes, and failure surges.
      </p>

      {anomalies.length === 0 ? (
        <div className="empty-state">✅ No anomalies detected — all patterns normal</div>
      ) : (
        <>
          {high.length > 0 && (
            <>
              <h3 style={{ color: "var(--red)", marginBottom: "0.75rem" }}>
                🔴 High Severity ({high.length})
              </h3>
              {high.map((a, i) => <AnomalyCard key={i} anomaly={a} />)}
            </>
          )}
          {medium.length > 0 && (
            <>
              <h3 style={{ color: "var(--yellow)", margin: "1.5rem 0 0.75rem" }}>
                🟡 Medium Severity ({medium.length})
              </h3>
              {medium.map((a, i) => <AnomalyCard key={i} anomaly={a} />)}
            </>
          )}
          {low.length > 0 && (
            <>
              <h3 style={{ color: "var(--blue)", margin: "1.5rem 0 0.75rem" }}>
                🔵 Low Severity ({low.length})
              </h3>
              {low.map((a, i) => <AnomalyCard key={i} anomaly={a} />)}
            </>
          )}
        </>
      )}
    </div>
  );
}