const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const pino = require("pino");
const filename = require.resolve("../utils/logger");
const source = fs.readFileSync(filename, "utf8");

for (const [name, environment, expectedLevel, expectedEnvironment] of [
  ["defaults", {}, "debug", "development"],
  ["legacy production", { nodeEnv: "production" }, "info", "production"],
  ["Node production", { NODE_ENV: "production" }, "info", "production"],
  ["configured", { LOG_LEVEL: "warn", SERVICE_NAME: "test-service", nodeEnv: "staging", NODE_ENV: "test" }, "warn", "staging"],
  ["Node environment", { NODE_ENV: "test" }, "debug", "test"],
]) test(`logger uses ${name} and redacts credentials`, () => {
  const lines = [];
  const destination = { write: (line) => lines.push(JSON.parse(line)) };
  let configuration;
  const factory = (options) => { configuration = options; return pino(options, destination); };
  factory.stdTimeFunctions = pino.stdTimeFunctions;
  const sandbox = { module: { exports: {} }, process: { env: environment }, require: (name) => {
    assert.equal(name, "pino");
    return factory;
  } };
  vm.runInNewContext(source, sandbox, { filename });
  const logger = sandbox.module.exports;
  assert.equal(configuration.level, expectedLevel);
  assert.equal(configuration.base.environment, expectedEnvironment);
  logger.warn({
    password: "private", body: { password: "private" }, headers: { authorization: "private", cookie: "private" },
    req: { body: { password: "private" }, headers: { authorization: "private", cookie: "private", "set-cookie": "private" } },
  }, "redaction test");
  assert.equal(lines.length, 1);
  assert.equal(lines[0].level, "warn");
  assert.equal(lines[0].service, environment.SERVICE_NAME || "inventory-sales-management-api");
  assert.equal(lines[0].password, "[REDACTED]");
  assert.equal(lines[0].body.password, "[REDACTED]");
  assert.equal(lines[0].req.headers.authorization, "[REDACTED]");
  assert.equal(lines[0].req.headers.cookie, "[REDACTED]");
  assert.equal(lines[0].req.headers["set-cookie"], "[REDACTED]");
  assert.equal(lines[0].req.body.password, "[REDACTED]");
  assert.equal(lines[0].headers.authorization, "[REDACTED]");
  assert.equal(lines[0].headers.cookie, "[REDACTED]");
  assert.ok(lines[0].time);
});
