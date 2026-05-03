export default function Logs({ logs }) {
  const stageColor = {
    DNS: "#f59e0b",
    TCP: "#ef4444",
    TLS: "#8b5cf6",
    HTTP: "#3b82f6",
  };

  return (
    <div className="logs-page">
      <h2>📋 Check Logs ({logs.length} recent entries)</h2>
      <div className="logs-table-wrapper">
        <table className="logs-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Endpoint</th>
              <th>Node</th>
              <th>Status</th>
              <th>Stage Failed</th>
              <th>HTTP Code</th>
              <th>Response Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={i} className={log.success ? "log-success" : "log-failure"}>
                <td>{new Date(log.timestamp).toLocaleTimeString()}</td>
                <td>{log.endpointUrl}</td>
                <td>{log.nodeId}</td>
                <td>
                  <span className={`status-pill ${log.success ? "up" : "down"}`}>
                    {log.success ? "✅ UP" : "❌ DOWN"}
                  </span>
                </td>
                <td>
                  {log.failureStage ? (
                    <span
                      className="stage-pill"
                      style={{ backgroundColor: stageColor[log.failureStage] }}
                    >
                      {log.failureStage}
                    </span>
                  ) : "—"}
                </td>
                <td>{log.httpStatus || "—"}</td>
                <td>{log.responseTime ? `${log.responseTime}ms` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}