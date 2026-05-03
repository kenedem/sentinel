export default function Dashboard({ data }) {
  if (!data) return <div className="empty">No data yet...</div>;

  const { summary, endpoints, nodes } = data;

  const stageColor = {
    DNS: "#f59e0b",
    TCP: "#ef4444",
    TLS: "#8b5cf6",
    HTTP: "#3b82f6",
  };

  const statusColor = {
    healthy: "#10b981",
    down: "#ef4444",
    degraded: "#f59e0b",
    unknown: "#6b7280",
  };

  const statusIcon = {
    healthy: "✅",
    down: "🔴",
    degraded: "⚠️",
    unknown: "❓",
  };

  return (
    <div className="dashboard">
      <div className="summary-cards">
        <div className="card card-total">
          <div className="card-value">{summary.total}</div>
          <div className="card-label">Total Services</div>
        </div>
        <div className="card card-healthy">
          <div className="card-value">{summary.healthy}</div>
          <div className="card-label">Healthy</div>
        </div>
        <div className="card card-down">
          <div className="card-value">{summary.down}</div>
          <div className="card-label">Down</div>
        </div>
        <div className="card card-incidents">
          <div className="card-value">{summary.openIncidents}</div>
          <div className="card-label">Open Incidents</div>
        </div>
      </div>

      <div className="section">
        <h2>Service Health</h2>
        <div className="endpoint-grid">
          {endpoints.map((ep) => (
            <div key={ep.id} className="endpoint-card">
              <div className="endpoint-header">
                <span className="endpoint-status-icon">{statusIcon[ep.status]}</span>
                <div>
                  <div className="endpoint-name">{ep.name}</div>
                  <div className="endpoint-url">{ep.url}</div>
                </div>
                <span
                  className="endpoint-badge"
                  style={{ backgroundColor: statusColor[ep.status] }}
                >
                  {ep.status.toUpperCase()}
                </span>
              </div>

              <div className="endpoint-stats">
                <div className="stat">
                  <div className="stat-value">
                    {ep.avgResponseTime ? `${ep.avgResponseTime}ms` : "—"}
                  </div>
                  <div className="stat-label">Avg Response</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{ep.uptime}%</div>
                  <div className="stat-label">Uptime</div>
                </div>
              </div>

              <div className="node-results">
                <div className="node-results-label">Node Results:</div>
                <div className="node-list">
                  {nodes.map((node) => {
                    const result = ep.nodeResults?.find((r) => r.nodeId === node.id);
                    if (!result) return (
                      <div key={node.id} className="node-chip unknown">
                        {node.name} — pending
                      </div>
                    );
                    return (
                      <div
                        key={node.id}
                        className={`node-chip ${result.success ? "success" : "failure"}`}
                        title={result.errorMessage || "OK"}
                      >
                        {node.name}
                        {!result.success && (
                          <span
                            className="stage-tag"
                            style={{ backgroundColor: stageColor[result.failureStage] }}
                          >
                            {result.failureStage}
                          </span>
                        )}
                        {result.responseTime && (
                          <span className="response-time">{result.responseTime}ms</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <h2>Request Lifecycle — How NIACS Classifies Failures</h2>
        <div className="lifecycle">
          {[
            { stage: "DNS", desc: "Resolves hostname to IP address", color: "#f59e0b", icon: "🔍" },
            { stage: "TCP", desc: "Opens connection to server port", color: "#ef4444", icon: "🔌" },
            { stage: "TLS", desc: "Negotiates SSL/TLS encryption", color: "#8b5cf6", icon: "🔒" },
            { stage: "HTTP", desc: "Sends request, receives response", color: "#3b82f6", icon: "📡" },
          ].map((step, i) => (
            <div key={step.stage} className="lifecycle-step">
              <div className="lifecycle-icon" style={{ borderColor: step.color }}>
                {step.icon}
              </div>
              <div className="lifecycle-label" style={{ color: step.color }}>
                {step.stage}
              </div>
              <div className="lifecycle-desc">{step.desc}</div>
              {i < 3 && <div className="lifecycle-arrow">→</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}