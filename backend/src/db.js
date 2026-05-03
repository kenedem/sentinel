// db.js - In-memory database (no real database needed for demo)

const db = {
  // Endpoints being monitored
  endpoints: [
    {
      id: "ep1",
      name: "Google",
      url: "https://www.google.com",
      interval: 30000,
      timeout: 5000,
      enabled: true,
    },
    {
      id: "ep2",
      name: "GitHub",
      url: "https://github.com",
      interval: 30000,
      timeout: 5000,
      enabled: true,
    },
    {
      id: "ep3",
      name: "Test Failing Service",
      url: "https://this-does-not-exist-niacs-test.com",
      interval: 30000,
      timeout: 5000,
      enabled: true,
    },
  ],

  // Monitoring nodes (simulated)
  nodes: [
    { id: "node-1", name: "Node Africa (Accra)", region: "af-west" },
    { id: "node-2", name: "Node Europe (London)", region: "eu-west" },
    { id: "node-3", name: "Node America (New York)", region: "us-east" },
  ],

  // All check logs - every result from every node
  logs: [],

  // Confirmed incidents (2+ nodes agree on failure)
  incidents: [],

  // Track last alert time per endpoint to avoid spam
  lastAlertTime: {},
};

module.exports = db;