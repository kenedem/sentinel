export default function Incidents({ incidents, onResolve }) {
  const open = incidents.filter((i) => i.status === "open");
  const resolved = incidents.filter((i) => i.status !== "open");

  const stageColor = {
    DNS: "#f59e0b",
    TCP: "#ef4444",
    TLS: "#8b5cf6",
    HTTP: "#3b82f6",
  };

  const IncidentCard = ({ incident }) => (
    <div className={`incident-card ${incident.status}`}>
      <div className="incident-header">
        <div>
          <span className="incident-icon">
            {incident.status === "open" ? "🚨" : "✅"}
          </span>
          <strong>{incident.endpointName}</strong>
          <span className="incident-url">{incident.endpointUrl}</span>
        </div>
        <div className="incident-meta">
          <span
            className="stage-badge"
            style={{ backgroundColor: stageColor[incident.failureStage] || "#6b7280" }}
          >
            Failed at {incident.failureStage}
          </span>
          {incident.status === "open" && (
            <button className="btn-resolve" onClick={() => onResolve(incident.id)}>
              Resolve
            </button>
          )}
        </div>
      </div>
      <div className="incident-details">
        <span>🕒 {new Date(incident.timestamp).toLocaleString()}</span>
        <span>
          📡 Confirmed by {incident.confirmedBy}/{incident.totalNodes} nodes:{" "}
          {incident.failedNodes.join(", ")}
        </span>
        {incident.resolvedAt && (
          <span>✅ Resolved: {new Date(incident.resolvedAt).toLocaleString()}</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="incidents-page">
      <h2>🚨 Open Incidents ({open.length})</h2>
      {open.length === 0 ? (
        <div className="empty-state">✅ No open incidents — all services healthy</div>
      ) : (
        open.map((i) => <IncidentCard key={i.id} incident={i} />)
      )}

      {resolved.length > 0 && (
        <>
          <h2 style={{ marginTop: "2rem" }}>✅ Resolved ({resolved.length})</h2>
          {resolved.map((i) => <IncidentCard key={i.id} incident={i} />)}
        </>
      )}
    </div>
  );
}