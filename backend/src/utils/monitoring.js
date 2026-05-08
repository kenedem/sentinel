
const NodeStatus = {
  Healthy: "Healthy",
  Warning: "Warning",
  Critical: "Critical",
};

function generateLog(endpoint, nodeId, responseTime) {
  let status;
  if (responseTime < 500) status = NodeStatus.Healthy;
  else if (responseTime < 2000) status = NodeStatus.Warning;
  else status = NodeStatus.Critical;

  return {
    endpoint,
    nodeId,
    responseTime,
    nodeStatus: status,
  };
}

module.exports = { generateLog, NodeStatus };
