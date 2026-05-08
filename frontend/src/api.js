const BASE_URL = 'http://localhost:3001/api';

export async function fetchEndpoints() {
  const res = await fetch(`${BASE_URL}/endpoints`);
  return res.json();
}

export async function fetchAgents() {
  const res = await fetch(`${BASE_URL}/agents`);
  return res.json();
}

export async function fetchLogs() {
  const res = await fetch(`${BASE_URL}/logs`);
  return res.json();
}

export async function fetchIncidents() {
  const res = await fetch(`${BASE_URL}/incidents`);
  return res.json();
}