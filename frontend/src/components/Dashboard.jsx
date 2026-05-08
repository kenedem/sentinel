import React, { useEffect, useState } from 'react';
import { fetchEndpoints, fetchAgents, fetchLogs, fetchIncidents } from '../api';

export default function Dashboard() {
  const [endpoints, setEndpoints] = useState([]);
  const [agents, setAgents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [incidents, setIncidents] = useState([]);

  // Poll every 5 seconds
  useEffect(() => {
    const fetchAll = async () => {
      setEndpoints(await fetchEndpoints());
      setAgents(await fetchAgents());
      setLogs(await fetchLogs());
      setIncidents(await fetchIncidents());
    };
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1>NIACS Dashboard</h1>

      <h2>Endpoints</h2>
      <ul>
        {endpoints.map(ep => (
          <li key={ep.id}>{ep.url} ({ep.method})</li>
        ))}
      </ul>

      <h2>Agents</h2>
      <ul>
        {agents.map(agent => (
          <li key={agent.id}>
            {agent.name} - {agent.region} - Last Seen: {agent.lastSeenAt} - {agent.enabled ? 'Online' : 'Offline'}
          </li>
        ))}
      </ul>

      <h2>Incidents</h2>
      <ul>
        {incidents.map(inc => (
          <li key={inc.id}>
            {inc.endpointUrl} - Status: {inc.status} - Failed Nodes: {inc.failedNodes?.join(', ')}
          </li>
        ))}
      </ul>
    </div>
  );
}