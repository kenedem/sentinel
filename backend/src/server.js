// server.js - NIACS Backend Entry Point

const express = require("express");
const cors = require("cors");
const apiRoutes = require("./routes/api");
const { startPoller } = require("./monitors/poller");

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", apiRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({
    name: "NIACS - Network Infrastructure Automated Confirmation System",
    version: "1.0.0",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

// Start Server + Poller
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║   NIACS - Network Infrastructure Automated          ║
  ║          Confirmation System                        ║
  ║                                                     ║
  ║   Backend running on http://localhost:3001          ║
  ║   API docs:  http://localhost:3001/api/status       ║
  ╚══════════════════════════════════════════════════════╝
  `);
  startPoller();
});