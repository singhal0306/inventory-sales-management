const pino = require("pino");

const isProduction =
  process.env.nodeEnv === "production" || process.env.NODE_ENV === "production";

const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  base: {
    service: process.env.SERVICE_NAME || "inventory-sales-management-api",
    environment: process.env.nodeEnv || process.env.NODE_ENV || "development",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers.set-cookie",
      "headers.authorization",
      "headers.cookie",
      "body.password",
      "req.body.password",
      "password",
    ],
    censor: "[REDACTED]",
  },
});

module.exports = logger;
