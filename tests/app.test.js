const { test } = require("node:test");
const assert = require("node:assert/strict");
const { api, expectError, stub, User } = require("./helpers");

test("GET / responds and unknown routes return 404", async (t) => {
  const request = await api(t);
  const response = await request("GET", "/", undefined, { auth: false });
  assert.equal(response.status, 200);
  assert.equal(response.text, "Hello from the server!");
  assert.equal((await request("GET", "/missing")).status, 404);
});

test("CORS permits configured origins and development loopback and LAN addresses", async (t) => {
  const request = await api(t, { environment: { clientOrigin: " https://stockroom.example, ,https://admin.example " } });
  for (const origin of ["https://stockroom.example", "https://admin.example", "http://localhost:3001", "https://127.0.0.1:3001", "http://[::1]:3001", "http://192.168.1.5:8080", "https://192.168.0.10:8080"]) {
    const response = await request("GET", "/", undefined, { headers: { Origin: origin } });
    assert.equal(response.status, 200);
    assert.equal(response.headers["access-control-allow-origin"], origin);
    assert.equal(response.headers["access-control-allow-credentials"], "true");
  }
  for (const origin of ["https://evil.example", "ftp://localhost", "invalid", "null", "http://localhost.evil.example", "http://192.169.1.5:8080", "http://192.168.1.5.evil.example:8080", "http://192.168.999.5:8080"]) {
    expectError(await request("GET", "/", undefined, { headers: { Origin: origin } }), 403, /CORS/);
  }
});

for (const environment of [
  { nodeEnv: "production", NODE_ENV: "test" }, { nodeEnv: "test", NODE_ENV: "production" },
]) test(`production CORS rejects unconfigured loopback and LAN origins (${JSON.stringify(environment)})`, async (t) => {
  const request = await api(t, { environment: { ...environment, clientOrigin: "https://stockroom.example" } });
  expectError(await request("GET", "/", undefined, { headers: { Origin: "http://localhost:3000" } }), 403, /CORS/);
  expectError(await request("GET", "/", undefined, { headers: { Origin: "http://192.168.1.5:8080" } }), 403, /CORS/);
  assert.equal((await request("GET", "/", undefined, { headers: { Origin: "https://stockroom.example" } })).status, 200);
});

test("LAN profile-photo deletion passes CORS preflight and reaches its authenticated handler", async (t) => {
  const request = await api(t, { environment: { nodeEnv: "development", NODE_ENV: "development", clientOrigin: "http://localhost:8080" } });
  const update = stub(t, User, "updateOne", { matchedCount: 1 });
  const origin = "http://192.168.1.5:8080";
  const preflight = await request("OPTIONS", "/api/user/profile-photo", undefined, {
    auth: false,
    headers: { Origin: origin, "Access-Control-Request-Method": "DELETE" },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers["access-control-allow-origin"], origin);
  assert.match(preflight.headers["access-control-allow-methods"], /DELETE/);

  const response = await request("DELETE", "/api/user/profile-photo", undefined, { headers: { Origin: origin } });
  assert.equal(response.status, 200, response.text);
  assert.equal(response.headers["access-control-allow-origin"], origin);
  assert.equal(response.headers["access-control-allow-credentials"], "true");
  assert.equal(response.body.hasProfilePhoto, false);
  assert.equal(update.mock.callCount(), 1);
});

test("CORS handles preflight and exposes tracing headers", async (t) => {
  const request = await api(t, { environment: { clientOrigin: undefined } });
  const response = await request("OPTIONS", "/api/customer", undefined, { auth: false, headers: { Origin: "http://localhost:3000", "Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "Content-Type,X-Trace-Id" } });
  assert.equal(response.status, 204);
  assert.match(response.headers["access-control-allow-methods"], /PUT/);
  assert.match(response.headers["access-control-allow-headers"], /X-Trace-Id/);
  const normal = await request("GET", "/", undefined, { headers: { Origin: "http://localhost:3000" } });
  assert.match(normal.headers["access-control-expose-headers"], /Traceparent/);
});

test("malformed JSON returns 400 without exposing a production stack", async (t) => {
  const request = await api(t);
  const response = await request("POST", "/api/user/login", Buffer.from("{"));
  assert.equal(response.status, 400);
  assert.equal(response.body.stack, null);
});
