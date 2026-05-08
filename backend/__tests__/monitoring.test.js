const { generateLog, NodeStatus } = require('../src/utils/monitoring');

describe("Monitoring Engine", () => {
  test("should mark a fast endpoint as Healthy", () => {
    const log = generateLog("http://example.com", "US-EAST-01", 100);
    expect(log.nodeStatus).toBe(NodeStatus.Healthy);
  });

  test("should mark a very slow endpoint as Critical", () => {
    const log = generateLog("http://example.com", "US-EAST-01", 6000);
    expect(log.nodeStatus).toBe(NodeStatus.Critical);
  });
});
