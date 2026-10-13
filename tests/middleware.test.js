const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const logger = require("../utils/logger");
const errorHandler = require("../middleware/errorMiddleware");
const requestContext = require("../middleware/requestContext");
const { env, ids } = require("./helpers");
const trace = "1234567890abcdef1234567890abcdef";
const parent = "1234567890abcdef";

for (const [name, headers, expectedTrace, expectedParent, flags] of [
  ["traceparent", { traceparent: `00-${trace.toUpperCase()}-${parent.toUpperCase()}-00`, "x-trace-id": "a".repeat(32), "x-span-id": "b".repeat(16), "x-client-id": "web:client-1" }, trace, parent, "00"],
  ["custom IDs", { "x-trace-id": "12345678-90ab-cdef-1234-567890abcdef", "x-span-id": "12345678-90abcdef" }, trace, parent, "01"],
  ["no headers", {}, undefined, undefined, "01"],
  ["zero IDs", { traceparent: `00-${"0".repeat(32)}-${"0".repeat(16)}-01`, "x-client-id": "bad client" }, undefined, undefined, "01"],
  ["malformed IDs", { "x-trace-id": "invalid", "x-span-id": "invalid", "x-client-id": "x".repeat(129) }, undefined, undefined, "01"],
  ["non-string IDs", { "x-trace-id": [], "x-span-id": [] }, undefined, undefined, "01"],
  ["invalid traceparent fallback", { traceparent: "not-valid", "x-trace-id": trace, "x-span-id": parent }, trace, parent, "01"],
]) test(`requestContext validates ${name} and emits matching response headers`, (t) => {
  const log = { info: t.mock.fn(), warn: t.mock.fn(), error: t.mock.fn() };
  t.mock.method(logger, "child", () => log);
  const req = { get: (key) => headers[key], method: "GET", originalUrl: "/api/customer?email=private", ip: "127.0.0.1" };
  const res = new EventEmitter();
  const responseHeaders = {};
  res.setHeader = (key, value) => { responseHeaders[key] = value; };
  res.statusCode = 200;
  const next = t.mock.fn();
  requestContext(req, res, next);
  assert.equal(next.mock.callCount(), 1);
  assert.match(req.context.traceId, /^[0-9a-f]{32}$/);
  assert.match(req.context.spanId, /^[0-9a-f]{16}$/);
  if (expectedTrace) assert.equal(req.context.traceId, expectedTrace);
  assert.equal(req.context.parentSpanId, expectedParent);
  assert.equal(responseHeaders["traceparent"], `00-${req.context.traceId}-${req.context.spanId}-${flags}`);
  assert.equal(responseHeaders["X-Trace-Id"], req.context.traceId);
  assert.equal(responseHeaders["X-Span-Id"], req.context.spanId);
  assert.equal(responseHeaders["X-Client-Id"], req.context.clientId);
  if (headers["x-client-id"] === "web:client-1") assert.equal(req.context.clientId, "web:client-1");
  else assert.match(req.context.clientId, /^[0-9a-f-]{36}$/);
  res.emit("finish");
  const fields = log.info.mock.calls[0].arguments[0];
  assert.equal(fields.path, "/api/customer");
  assert.equal(fields.userId, undefined);
  assert.equal(typeof fields.durationMs, "number");
  req.user = { _id: ids.actor };
  res.statusCode = 400;
  res.emit("finish");
  assert.equal(log.warn.mock.calls[0].arguments[0].userId, String(ids.actor));
  res.statusCode = 500;
  res.emit("finish");
  assert.equal(log.error.mock.callCount(), 1);
});

for (const [name, environment, err, existingStatus, expectedStatus, hasStack, useRequestLog] of [
  ["explicit 400", { nodeEnv: "test", NODE_ENV: "test" }, Object.assign(new Error("Bad request"), { statusCode: 400, code: "BAD_INPUT" }), 200, 400, false, true],
  ["existing 403", { nodeEnv: "test", NODE_ENV: "test" }, Object.assign(new Error("Denied"), { code: 123 }), 403, 403, false, false],
  ["default 500", { nodeEnv: "test", NODE_ENV: "test" }, Object.assign(new Error("Failure"), { code: {} }), 200, 500, false, true],
  ["legacy development", { nodeEnv: "development", NODE_ENV: "test" }, new Error("Failure"), 200, 500, true, true],
  ["Node development", { nodeEnv: "test", NODE_ENV: "development" }, new Error("Failure"), 200, 500, true, false],
]) test(`errorHandler respects ${name}, logging severity and stack visibility`, (t) => {
  env(t, environment);
  const log = { warn: t.mock.fn(), error: t.mock.fn() };
  t.mock.method(logger, "warn", log.warn);
  t.mock.method(logger, "error", log.error);
  const req = useRequestLog ? { log, context: { traceId: trace } } : {};
  const res = { statusCode: existingStatus, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } };
  errorHandler(err, req, res, () => assert.fail("Error handler must finish the response"));
  assert.equal(res.statusCode, expectedStatus);
  assert.equal(res.body.message, err.message);
  assert.equal(res.body.stack, hasStack ? err.stack : null);
  assert.equal(res.body.traceId, useRequestLog ? trace : undefined);
  const calls = expectedStatus >= 500 ? log.error.mock.calls : log.warn.mock.calls;
  assert.equal(calls.length, 1);
  assert.equal(calls[0].arguments[0].errorCode, ["string", "number"].includes(typeof err.code) ? err.code : undefined);
});
