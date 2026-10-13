const { test } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { api, env, invoke } = require("./helpers");
const { getHealth } = require("../controllers/healthController");

// Shadow connection properties without changing Mongoose state or connecting.
const database = (t, state, command = t.mock.fn(async () => ({ ok: 1 }))) => {
  const connection = mongoose.connection;
  for (const [key, value] of Object.entries({ readyState: state, db: { command } })) {
    const previous = Object.getOwnPropertyDescriptor(connection, key);
    Object.defineProperty(connection, key, { configurable: true, writable: true, value });
    t.after(() => {
      if (previous) Object.defineProperty(connection, key, previous);
      else delete connection[key];
    });
  }
  return command;
};

test("GET /api/health is public and reports a successful database ping", async (t) => {
  const request = await api(t, { environment: { SERVICE_NAME: "health-test-api" } });
  const command = database(t, 1);

  const response = await request("GET", "/api/health", undefined, { auth: false });

  assert.equal(response.status, 200);
  assert.equal(response.headers["cache-control"], "no-store");
  assert.equal(response.body.status, "ok");
  assert.equal(response.body.service, "health-test-api");
  assert.equal(response.body.checks.mongodb.status, "up");
  assert.ok(Number.isFinite(Date.parse(response.body.timestamp)));
  assert.ok(Number.isInteger(response.body.uptimeSeconds) && response.body.uptimeSeconds >= 0);
  assert.deepEqual(command.mock.calls[0].arguments, [{ ping: 1 }]);
});

for (const state of [0, 2, 3]) test(`GET /api/health returns 503 for non-ready database state ${state}`, async (t) => {
  const request = await api(t);
  const command = database(t, state);
  const response = await request("GET", "/api/health", undefined, { auth: false });

  assert.equal(response.status, 503);
  assert.equal(response.headers["cache-control"], "no-store");
  assert.equal(response.body.status, "error");
  assert.equal(response.body.checks.mongodb.status, "down");
  assert.equal(command.mock.callCount(), 0);
});

test("GET /api/health handles ping failures without leaking details and detects recovery", async (t) => {
  const request = await api(t);
  let available = false;
  database(t, 1, async () => {
    if (!available) throw new Error("Sensitive database connection details");
    return { ok: 1 };
  });

  const failed = await request("GET", "/api/health", undefined, { auth: false });
  assert.equal(failed.status, 503);
  assert.equal(failed.body.checks.mongodb.status, "down");
  assert.doesNotMatch(failed.text, /Sensitive|stack|mongoUrl/);

  available = true;
  assert.equal((await request("GET", "/api/health", undefined, { auth: false })).status, 200);
});

test("GET /api/health rejects an unsuccessful ping result", async (t) => {
  const request = await api(t);
  database(t, 1, async () => ({ ok: 0 }));
  assert.equal((await request("GET", "/api/health", undefined, { auth: false })).status, 503);
});

test("a stalled database probe times out after one second", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  database(t, 1, () => new Promise(() => {}));
  const pending = invoke(getHealth);
  t.mock.timers.tick(1000);
  const result = await pending;

  assert.equal(result.error, undefined);
  assert.equal(result.res.statusCode, 503);
  assert.equal(result.res.body.checks.mongodb.status, "down");
});

test("GET /api/health/live remains healthy without MongoDB and supports HEAD", async (t) => {
  const request = await api(t, { environment: { SERVICE_NAME: undefined } });
  const command = database(t, 0);
  const response = await request("GET", "/api/health/live", undefined, { auth: false });

  assert.equal(response.status, 200);
  assert.equal(response.headers["cache-control"], "no-store");
  assert.equal(response.body.status, "ok");
  assert.equal(response.body.service, "inventory-sales-management-api");
  assert.equal(command.mock.callCount(), 0);
  const head = await request("HEAD", "/api/health/live", undefined, { auth: false });
  assert.equal(head.status, 200);
  assert.equal(head.text, "");
});

test("readiness forwards unexpected response errors to error middleware", async (t) => {
  env(t, { SERVICE_NAME: undefined });
  database(t, 0);
  const failure = new Error("Response failed");
  let received;
  await getHealth({}, { set() { throw failure; } }, (error) => { received = error; });
  assert.equal(received, failure);
});
