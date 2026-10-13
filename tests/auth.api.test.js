const { test } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { api, actor, ids, stub, reject, expectError, invoke, User } = require("./helpers");
const { requireAdmin } = require("../middleware/authMiddleware");

const protectedRoutes = [
  ["POST", "/api/user/logout"], ["GET", "/api/user/getuser"], ["PATCH", "/api/user/password"],
  ["GET", "/api/user/profile-photo"], ["POST", "/api/user/profile-photo"], ["DELETE", "/api/user/profile-photo"],
  ["GET", "/api/user/admin/users"], ["PATCH", `/api/user/admin/users/${ids.other}`],
  ["GET", "/api/inventory/getitems"], ["POST", "/api/inventory/addtoinventory"],
  ["POST", `/api/inventory/addstock/${ids.item}`], ["PATCH", `/api/inventory/archive/${ids.item}`], ["PATCH", `/api/inventory/restore/${ids.item}`],
  ["POST", "/api/bill/newbill"], ["GET", "/api/bill/allbills"],
  ["GET", "/api/customer"], ["POST", "/api/customer"], ["PUT", `/api/customer/${ids.customer}`],
  ["DELETE", `/api/customer/${ids.customer}`], ["POST", `/api/customer/${ids.customer}/restore`],
  ["GET", "/api/analytics/sales"], ["GET", "/api/analytics/sales/export"],
];

for (const [method, path] of protectedRoutes) test(`${method} ${path} rejects anonymous access`, async (t) => {
  const request = await api(t);
  const find = stub(t, User, "findById", actor);
  expectError(await request(method, path, undefined, { auth: false }), 401, /Not Authorized/);
  assert.equal(find.mock.callCount(), 0);
});

test("authentication rejects forged, malformed, expired and not-yet-valid JWTs", async (t) => {
  const request = await api(t);
  const tokens = [
    "invalid",
    jwt.sign({ id: String(ids.actor) }, "wrong-secret"),
    jwt.sign({ id: String(ids.actor) }, process.env.jwtSecret, { expiresIn: -1 }),
    jwt.sign({ id: String(ids.actor) }, process.env.jwtSecret, { notBefore: "1h" }),
  ];
  for (const token of tokens) {
    expectError(await request("GET", "/api/user/getuser", undefined, { headers: { Cookie: `jwt=${token}` } }), 401, /jwt|signature|active/i);
  }
});

test("authentication reloads account status and handles removed users and database failures", async (t) => {
  const request = await api(t);
  stub(t, User, "findById", null);
  expectError(await request("GET", "/api/user/getuser"), 401, /User not found/);
  stub(t, User, "findById", { ...actor, isActive: false });
  expectError(await request("GET", "/api/user/getuser"), 403, /disabled/);
  reject(t, User, "findById");
  expectError(await request("GET", "/api/user/getuser"), 500, /Database unavailable/);
  const find = stub(t, User, "findById", { ...actor, role: undefined, profilePhoto: { contentType: "image/png" } });
  const response = await request("GET", "/api/user/getuser");
  assert.equal(response.body.role, "user");
  assert.equal(response.body.hasProfilePhoto, true);
  assert.deepEqual(find.mock.calls[0].arguments, [String(ids.actor)]);
  assert.deepEqual(find.queries[0].calls[0], { method: "select", args: ["-password -profilePhoto.data"] });
});

for (const [method, path] of protectedRoutes.filter(([, path]) => path.includes("/admin/"))) {
  test(`${method} ${path} rejects authenticated non-admin users`, async (t) => {
    const request = await api(t);
    expectError(await request(method, path, {}), 403, /Administrator access/);
  });
}

test("requireAdmin rejects a missing identity and accepts administrators", async () => {
  const rejected = await invoke(requireAdmin, { user: undefined });
  assert.equal(rejected.error.statusCode, 403);
  assert.match(rejected.error.message, /Administrator access/);
  assert.equal((await invoke(requireAdmin, { user: { ...actor, role: "admin" } })).error, undefined);
});
