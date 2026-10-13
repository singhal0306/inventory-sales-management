const { test } = require("node:test");
const assert = require("node:assert/strict");
const { api, actor, ids, stub, reject, expectError, User } = require("./helpers");
const endpoint = `/api/user/admin/users/${ids.other}`;
const payload = { name: " Updated User ", email: " updated@example.com ", role: "user", isActive: true };

test("GET /api/user/admin/users requires admin and normalizes legacy account fields", async (t) => {
  const request = await api(t, { user: { ...actor, role: "admin" } });
  const find = stub(t, User, "find", [{ ...actor, role: undefined, isActive: undefined }, { ...actor, _id: ids.other, role: "admin", isActive: false, password: "must-not-be-returned", profilePhoto: { contentType: "image/png", data: Buffer.from("private image bytes") } }]);
  const response = await request("GET", "/api/user/admin/users");
  assert.equal(response.status, 200);
  assert.equal(response.body.users[0].role, "user");
  assert.equal(response.body.users[0].isActive, true);
  assert.equal(response.body.users[1].isActive, false);
  assert.equal(response.body.users[0].hasProfilePhoto, false);
  assert.equal(response.body.users[1].hasProfilePhoto, true);
  assert.equal(response.body.users[1].profilePhoto, undefined);
  assert.equal(response.body.users[1].password, undefined);
  assert.deepEqual(find.queries[0].calls[0], { method: "select", args: ["name email role isActive createdAt updatedAt profilePhoto.contentType"] });
  reject(t, User, "find");
  expectError(await request("GET", "/api/user/admin/users"), 500, /Database unavailable/);
});

test("PATCH /api/user/admin/users/:id only updates allowlisted fields", async (t) => {
  const request = await api(t, { user: { ...actor, role: "admin" } });
  const update = stub(t, User, "findByIdAndUpdate", { ...actor, _id: ids.other, ...payload, profilePhoto: { contentType: "image/png" } });
  const response = await request("PATCH", endpoint, { ...payload, password: "overwrite", createdBy: String(ids.other) });
  assert.equal(response.status, 200);
  assert.equal(response.body.user.hasProfilePhoto, true);
  assert.equal(response.body.user.profilePhoto, undefined);
  assert.deepEqual(update.mock.calls[0].arguments, [String(ids.other), { $set: { name: "Updated User", email: "updated@example.com", role: "user", isActive: true } }, { new: true, runValidators: true }]);
});

test("GET admin user photo requires authentication and administrator access", async (t) => {
  const request = await api(t);
  const path = `${endpoint}/profile-photo`;
  expectError(await request("GET", path, undefined, { auth: false }), 401, /Not Authorized/);
  expectError(await request("GET", path), 403, /Administrator access/);
  expectError(await request("GET", `${path}?id=${ids.actor}`), 403, /Administrator access/);
});

test("GET admin user photo returns the requested user's image without exposing account data", async (t) => {
  const admin = { ...actor, role: "admin" };
  const request = await api(t, { user: admin });
  const data = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const lookup = stub(t, User, "findById", (id) => String(id) === String(ids.actor)
    ? admin : { _id: ids.other, profilePhoto: { data, contentType: "image/png" } });

  const response = await request("GET", `${endpoint}/profile-photo`);

  assert.equal(response.status, 200);
  assert.deepEqual(response.buffer, data);
  assert.equal(response.headers["content-type"], "image/png");
  assert.equal(response.headers["cache-control"], "private, no-store");
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.equal(lookup.mock.calls[1].arguments[0], String(ids.other));
  assert.deepEqual(lookup.queries[1].calls[0], { method: "select", args: ["profilePhoto"] });
});

test("GET admin user photo handles invalid IDs, missing photos and database failures", async (t) => {
  const admin = { ...actor, role: "admin" };
  const request = await api(t, { user: admin });
  let target = null;
  stub(t, User, "findById", (id) => {
    if (String(id) === String(ids.actor)) return admin;
    if (target instanceof Error) throw target;
    return target;
  });

  expectError(await request("GET", "/api/user/admin/users/invalid/profile-photo"), 400, /Invalid user ID/);
  for (const missing of [null, {}, { profilePhoto: { contentType: "image/png" } }, { profilePhoto: { data: Buffer.from("photo") } }]) {
    target = missing;
    expectError(await request("GET", `${endpoint}/profile-photo`), 404, /No profile photo/);
  }
  target = new Error("Database unavailable");
  expectError(await request("GET", `${endpoint}/profile-photo`), 500, /Database unavailable/);
});

for (const [name, path, body, message] of [
  ["invalid ID", "/api/user/admin/users/invalid", payload, /Invalid user ID/],
  ["missing name", endpoint, { ...payload, name: undefined }, /Name and email/],
  ["blank name", endpoint, { ...payload, name: " " }, /Name and email/],
  ["missing email", endpoint, { ...payload, email: undefined }, /Name and email/],
  ["blank email", endpoint, { ...payload, email: " " }, /Name and email/],
  ["invalid role", endpoint, { ...payload, role: "owner" }, /valid role/],
  ["invalid account status", endpoint, { ...payload, isActive: "true" }, /valid role/],
  ["self demotion", `/api/user/admin/users/${ids.actor}`, payload, /own admin access/],
  ["self disabling", `/api/user/admin/users/${ids.actor}`, { ...payload, role: "admin", isActive: false }, /own admin access/],
]) test(`PATCH admin user rejects ${name}`, async (t) => {
  const request = await api(t, { user: { ...actor, role: "admin" } });
  expectError(await request("PATCH", path, body), 400, message);
});

test("PATCH admin user permits an admin to edit their own profile while preserving access", async (t) => {
  const request = await api(t, { user: { ...actor, role: "admin" } });
  stub(t, User, "findByIdAndUpdate", { ...actor, role: "admin" });
  assert.equal((await request("PATCH", `/api/user/admin/users/${ids.actor}`, { ...payload, role: "admin" })).status, 200);
});

test("PATCH admin user translates missing users, duplicate email, validation and database failures", async (t) => {
  const request = await api(t, { user: { ...actor, role: "admin" } });
  stub(t, User, "findByIdAndUpdate", null);
  expectError(await request("PATCH", endpoint, payload), 404, /User not found/);
  for (const [error, status, message] of [
    [Object.assign(new Error("duplicate"), { code: 11000 }), 409, /email is already used/],
    [Object.assign(new Error("invalid"), { name: "ValidationError" }), 400, /valid name, email/],
    [new Error("Database unavailable"), 500, /Database unavailable/],
  ]) {
    reject(t, User, "findByIdAndUpdate", error);
    expectError(await request("PATCH", endpoint, payload), status, message);
  }
});
