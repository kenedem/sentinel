// checker.js - The heart of NIACS
// Checks each stage of a network request: DNS → TCP → TLS → HTTP

const https = require("https");
const http = require("http");
const dns = require("dns");
const { URL } = require("url");

async function checkEndpoint(endpoint, nodeId) {
  const startTime = Date.now();
  const result = {
    endpointId: endpoint.id,
    endpointUrl: endpoint.url,
    nodeId: nodeId,
    timestamp: new Date().toISOString(),
    success: false,
    failureStage: null,
    httpStatus: null,
    responseTime: null,
    errorMessage: null,
  };

  let parsedUrl;
  try {
    parsedUrl = new URL(endpoint.url);
  } catch (e) {
    result.failureStage = "DNS";
    result.errorMessage = "Invalid URL format";
    result.responseTime = Date.now() - startTime;
    return result;
  }

  const hostname = parsedUrl.hostname;
  const isHttps = parsedUrl.protocol === "https:";

  // STAGE 1: DNS Resolution
  try {
    await resolveDns(hostname);
  } catch (err) {
    result.failureStage = "DNS";
    result.errorMessage = `DNS resolution failed: ${err.message}`;
    result.responseTime = Date.now() - startTime;
    return result;
  }

  // STAGES 2 (TCP) + 3 (TLS) + 4 (HTTP)
  try {
    const httpResult = await makeHttpRequest(endpoint.url, endpoint.timeout, isHttps);
    result.httpStatus = httpResult.statusCode;
    result.responseTime = Date.now() - startTime;

    if (httpResult.statusCode >= 200 && httpResult.statusCode < 500) {
      result.success = true;
    } else {
      result.failureStage = "HTTP";
      result.errorMessage = `HTTP error: status ${httpResult.statusCode}`;
    }
  } catch (err) {
    result.responseTime = Date.now() - startTime;
    const msg = err.message || "";

    if (msg.includes("ECONNREFUSED") || msg.includes("ECONNRESET") || msg.includes("ETIMEDOUT")) {
      result.failureStage = "TCP";
      result.errorMessage = `TCP connection failed: ${msg}`;
    } else if (msg.includes("certificate") || msg.includes("SSL") || msg.includes("TLS") || msg.includes("CERT")) {
      result.failureStage = "TLS";
      result.errorMessage = `TLS/SSL handshake failed: ${msg}`;
    } else if (msg.includes("ENOTFOUND") || msg.includes("getaddrinfo")) {
      result.failureStage = "DNS";
      result.errorMessage = `DNS lookup failed: ${msg}`;
    } else {
      result.failureStage = "HTTP";
      result.errorMessage = `Request failed: ${msg}`;
    }
  }

  return result;
}

function resolveDns(hostname) {
  return new Promise((resolve, reject) => {
    dns.lookup(hostname, (err, address) => {
      if (err) reject(err);
      else resolve(address);
    });
  });
}

function makeHttpRequest(url, timeout, isHttps) {
  return new Promise((resolve, reject) => {
    const lib = isHttps ? https : http;
    const options = {
      timeout: timeout || 5000,
      rejectUnauthorized: true,
    };

    const req = lib.get(url, options, (res) => {
      res.resume();
      resolve({ statusCode: res.statusCode });
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("ETIMEDOUT: Request timed out"));
    });

    req.on("error", (err) => {
      reject(err);
    });
  });
}

module.exports = { checkEndpoint };