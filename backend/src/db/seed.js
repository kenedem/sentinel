const db = require('./database');

const endpoints = [
  { url: 'https://example.com', method: 'GET', check_interval_sec: 30, enabled: true },
  { url: 'https://httpbin.org/status/200', method: 'GET', check_interval_sec: 30, enabled: true },
  { url: 'https://httpbin.org/status/500', method: 'GET', check_interval_sec: 30, enabled: true },
];

async function seedEndpoints() {
  console.log('[SEED] Seeding endpoints...');
  for (const ep of endpoints) {
    try {
      const id = await db.createEndpoint(ep);
      console.log(`[SEED] Added endpoint: ${ep.url} (ID: ${id})`);
    } catch (err) {
      console.error(`[SEED] Error adding endpoint: ${ep.url}`, err.message);
    }
  }
  console.log('[SEED] Endpoint seeding complete');
}

seedEndpoints();