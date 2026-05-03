import { useState, useEffect, useCallback } from "react";
import Dashboard from "./components2/Dashboard";
import Incidents from "./components2/Incidents";
import Logs from "./components2/Logs";
import Endpoints from "./components2/Endpoints";
import Anomalies from "./components2/Anomalies";
const API_BASE = "http://localhost:3001/api";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [statusData, setStatusData] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [statusRes, incidentsRes, logsRes, anomaliesRes] = await Promise.all([
        fetch(`${API_BASE}/status`),
        fetch(`${API_BASE}/incidents`),
        fetch(`${API_BASE}/logs?limit=50`),
        fetch(`${API_BASE}/anomalies`),
      ]);

      const status = await statusRes.json();
      const incidentsData = await incidentsRes.json();
      const logsData = await logsRes.json();
      const anomaliesData = await anomaliesRes.json();

      setStatusData(status);
      setIncidents(incidentsData.incidents || []);
      setLogs(logsData.logs || []);
      setAnomalies(anomaliesData.anomalies || []);
      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const resolveIncident = async (id) => {
    await fetch(`${API_BASE}/incidents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved" }),
    });
    fetchAll();
  };

  const triggerCheckNow = async () => {
    await fetch(`${API_BASE}/check-now`, { method: "POST" });
    setTimeout(fetchAll, 1000);
  };

  const addEndpoint = async (endpoint) => {
    await fetch(`${API_BASE}/endpoints`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(endpoint),
    });
    fetchAll();
  };

  const deleteEndpoint = async (id) => {
    await fetch(`${API_BASE}/endpoints/${id}`, { method: "DELETE" });
    fetchAll();
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "anomalies", label: "Anomalies", icon: "🔍", badge: anomalies.filter((a) => a.severity === "high").length },
    { id: "incidents", label: "Incidents", icon: "🚨", badge: incidents.filter((i) => i.status === "open").length },
    { id: "logs", label: "Logs", icon: "📋" },
    { id: "endpoints", label: "Endpoints", icon: "⚙️" },
  ];

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">🌐</span>
            <div>
              <h1>Sentinel</h1>
              <p>Real-Time Web Service Monitoring</p>
            </div>
          </div>
        </div>
        <div className="header-right">
          {lastUpdated && (
            <span className="last-updated">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button className="btn-check-now" onClick={triggerCheckNow}>
            ▶ Check Now
          </button>
        </div>
      </header>

      <nav className="nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
            {tab.badge > 0 && <span className="badge">{tab.badge}</span>}
          </button>
        ))}
      </nav>

      <main className="main">
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Connecting to Sentinel backend...</p>
          </div>
        ) : (
          <>
            {activeTab === "dashboard" && <Dashboard data={statusData} />}
            {activeTab === "anomalies" && <Anomalies anomalies={anomalies} />}
            {activeTab === "incidents" && (
              <Incidents incidents={incidents} onResolve={resolveIncident} />
            )}
      
      
            {activeTab === "logs" && <Logs logs={logs} />}
            {activeTab === "endpoints" && (
              <Endpoints
                endpoints={statusData?.endpoints || []}
                onAdd={addEndpoint}
                onDelete={deleteEndpoint}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}