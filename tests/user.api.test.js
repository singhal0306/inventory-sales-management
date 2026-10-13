const { test } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { api, ids, actor, stub, reject, document, expectError, multipart, User } = require("./helpers");

const registration = { firstName: "Test", lastName: "User", email: "test@example.com", password: "secret123" };
const credentials = { email: "test@example.com", password: "secret123" };
const hashedPassword = bcrypt.hashSync(credentials.password, 4);
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);

test("POST /api/user/register creates only a regular user and issues an HTTP-only cookie", async (t) => {
  const request = await api(t);
  stub(t, User, "findOne", null);
  const create = stub(t, User, "create", document(actor));
  const response = await request("POST", "/api/user/register", { ...registration, role: "admin", isActive: false }, { auth: false });
  assert.equal(response.status, 200);
  assert.deepEqual(create.mock.calls[0].arguments[0], { name: "TEST USER", email: registration.email, password: registration.password, role: "user" });
  assert.match(response.headers["set-cookie"][0], /HttpOnly/);
  assert.match(response.headers["set-cookie"][0], /SameSite=Lax/);
  assert.equal(response.body.password, undefined);
});

for (const [name, body, status, message] of [
  ["missing first name", { ...registration, firstName: undefined }, 400, /all the information/],
  ["blank first name", { ...registration, firstName: " " }, 400, /all the information/],
  ["missing last name", { ...registration, lastName: undefined }, 400, /all the information/],
  ["blank last name", { ...registration, lastName: " " }, 400, /all the information/],
  ["missing email", { ...registration, email: undefined }, 400, /all the information/],
  ["blank email", { ...registration, email: " " }, 400, /all the information/],
  ["missing password", { ...registration, password: undefined }, 400, /all the information/],
  ["empty password", { ...registration, password: "" }, 400, /all the information/],
  ["short password", { ...registration, password: "12345" }, 400, /Minimum password/],
]) test(`POST /api/user/register rejects ${name}`, async (t) => {
  const request = await api(t);
  expectError(await request("POST", "/api/user/register", body, { auth: false }), status, message);
});

test("POST /api/user/register rejects duplicates, unsuccessful creation, and database errors", async (t) => {
  const request = await api(t);
  stub(t, User, "findOne", actor);
  expectError(await request("POST", "/api/user/register", registration), 400, /already Exist/);
  stub(t, User, "findOne", null);
  stub(t, User, "create", null);
  expectError(await request("POST", "/api/user/register", registration), 400, /Something went wrong/);
  reject(t, User, "findOne");
  expectError(await request("POST", "/api/user/register", registration), 500, /Database unavailable/);
});

for (const environment of [
  { cookieSameSite: undefined, nodeEnv: "test", NODE_ENV: "test" },
  { cookieSameSite: "None", nodeEnv: "test", NODE_ENV: "test" },
  { cookieSameSite: "strict", nodeEnv: "production", NODE_ENV: "test" },
  { cookieSameSite: "lax", nodeEnv: "test", NODE_ENV: "production" },
]) test(`POST /api/user/login cookie policy ${JSON.stringify(environment)}`, async (t) => {
  const request = await api(t, { environment });
  stub(t, User, "findOne", { ...actor, password: hashedPassword, profilePhoto: { contentType: "image/png" } });
  const response = await request("POST", "/api/user/login", credentials, { auth: false });
  assert.equal(response.status, 200);
  assert.equal(response.body.user.role, "user");
  assert.equal(response.body.user.hasProfilePhoto, true);
  assert.equal(response.body.user.password, undefined);
  const cookie = response.headers["set-cookie"][0];
  const shouldBeSecure = environment.nodeEnv === "production" || environment.NODE_ENV === "production" || environment.cookieSameSite === "None";
  assert.equal(cookie.includes("; Secure"), shouldBeSecure);
  assert.match(cookie, /HttpOnly/);
  const token = decodeURIComponent(cookie.split(";")[0].slice(4));
  assert.equal(jwt.verify(token, process.env.jwtSecret).id, String(ids.actor));
});

test("POST /api/user/login defaults legacy roles and hasProfilePhoto", async (t) => {
  const request = await api(t);
  stub(t, User, "findOne", { ...actor, role: undefined, password: hashedPassword });
  const response = await request("POST", "/api/user/login", credentials);
  assert.equal(response.body.user.role, "user");
  assert.equal(response.body.user.hasProfilePhoto, false);
});

test("POST /api/user/login rejects missing, unknown, incorrect, and disabled credentials", async (t) => {
  const request = await api(t);
  for (const body of [{}, { email: credentials.email }, { password: credentials.password }]) {
    expectError(await request("POST", "/api/user/login", body), 400, /both Email and Password/);
  }
  stub(t, User, "findOne", null);
  expectError(await request("POST", "/api/user/login", credentials), 400, /Invalid Credentials/);
  stub(t, User, "findOne", { ...actor, password: hashedPassword });
  expectError(await request("POST", "/api/user/login", { ...credentials, password: "wrong123" }), 400, /Invalid Credentials/);
  stub(t, User, "findOne", { ...actor, password: hashedPassword, isActive: false });
  expectError(await request("POST", "/api/user/login", credentials), 403, /disabled/);
  reject(t, User, "findOne");
  expectError(await request("POST", "/api/user/login", credentials), 500, /Database unavailable/);
});

test("GET /api/user/getuser returns authenticated identity and POST /logout clears the cookie", async (t) => {
  const request = await api(t);
  const response = await request("GET", "/api/user/getuser");
  assert.deepEqual(response.body, { _id: String(ids.actor), name: actor.name, email: actor.email, role: "user", hasProfilePhoto: false });
  const logout = await request("POST", "/api/user/logout");
  assert.equal(logout.status, 200);
  assert.match(logout.headers["set-cookie"][0], /jwt=;/);
  assert.match(logout.headers["set-cookie"][0], /Expires=Thu, 01 Jan 1970/);
  assert.doesNotMatch(logout.headers["set-cookie"][0], /Max-Age=/);
});

test("PATCH /api/user/password verifies the current password and delegates hashing to save", async (t) => {
  const request = await api(t);
  const user = document({ ...actor, password: hashedPassword });
  const save = t.mock.method(user, "save", async () => user);
  stub(t, User, "findById", user);
  const response = await request("PATCH", "/api/user/password", { currentPassword: credentials.password, newPassword: "changed123", confirmPassword: "changed123" });
  assert.equal(response.status, 200);
  assert.equal(user.password, "changed123");
  assert.deepEqual(save.mock.calls[0].arguments, [{ validateModifiedOnly: true }]);
  assert.equal(response.body.password, undefined);
});

for (const [name, body, message] of [
  ["missing current password", { newPassword: "changed123", confirmPassword: "changed123" }, /Provide your current/],
  ["missing new password", { currentPassword: "secret123", confirmPassword: "changed123" }, /Provide your current/],
  ["missing confirmation", { currentPassword: "secret123", newPassword: "changed123" }, /Provide your current/],
  ["short new password", { currentPassword: "secret123", newPassword: "12345", confirmPassword: "12345" }, /6 to 23/],
  ["long new password", { currentPassword: "secret123", newPassword: "x".repeat(24), confirmPassword: "x".repeat(24) }, /6 to 23/],
  ["mismatched confirmation", { currentPassword: "secret123", newPassword: "changed123", confirmPassword: "other123" }, /do not match/],
  ["incorrect current password", { currentPassword: "wrong123", newPassword: "changed123", confirmPassword: "changed123" }, /Current password is incorrect/],
  ["unchanged password", { currentPassword: "secret123", newPassword: "secret123", confirmPassword: "secret123" }, /different from/],
]) test(`PATCH /api/user/password rejects ${name}`, async (t) => {
  const request = await api(t);
  stub(t, User, "findById", document({ ...actor, password: hashedPassword }));
  expectError(await request("PATCH", "/api/user/password", body), 400, message);
});

test("PATCH /api/user/password handles a user deleted after authentication and save failures", async (t) => {
  const request = await api(t);
  let calls = 0;
  stub(t, User, "findById", () => ++calls === 1 ? actor : null);
  const body = { currentPassword: "secret123", newPassword: "changed123", confirmPassword: "changed123" };
  expectError(await request("PATCH", "/api/user/password", body), 401, /User not found/);
  const user = document({ ...actor, password: hashedPassword });
  t.mock.method(user, "save", async () => { throw new Error("Save failed"); });
  stub(t, User, "findById", user);
  expectError(await request("PATCH", "/api/user/password", body), 500, /Save failed/);
});

for (const [type, data] of [
  ["image/png", png],
  ["image/jpeg", Buffer.from([255, 216, 255, 0])],
  ["image/webp", Buffer.from("RIFF1234WEBP")],
]) test(`POST and GET /api/user/profile-photo handle ${type}`, async (t) => {
  const request = await api(t);
  const update = stub(t, User, "updateOne", { matchedCount: 1 });
  const upload = multipart([{ type, data }]);
  const response = await request("POST", "/api/user/profile-photo", upload.body, { headers: upload.headers });
  assert.equal(response.status, 200);
  assert.equal(response.body.hasProfilePhoto, true);
  assert.deepEqual(update.mock.calls[0].arguments, [{ _id: ids.actor }, { $set: { profilePhoto: { data, contentType: type } } }]);
  stub(t, User, "findById", { ...actor, profilePhoto: { contentType: type, data } });
  const photo = await request("GET", "/api/user/profile-photo");
  assert.equal(photo.status, 200);
  assert.equal(photo.headers["content-type"], type);
  assert.equal(photo.headers["cache-control"], "private, no-store");
  assert.equal(photo.headers["x-content-type-options"], "nosniff");
  assert.deepEqual(photo.buffer, data);
});

test("POST /api/user/profile-photo rejects empty, unsupported, forged, oversized, and unexpected files", async (t) => {
  const request = await api(t);
  expectError(await request("POST", "/api/user/profile-photo", {}), 400, /Choose an image/);
  for (const [parts, status, message] of [
    [[{ type: "text/plain", data: png }], 415, /JPEG, PNG, or WebP/],
    [[{ type: "image/png", data: Buffer.from("not an image") }], 415, /not a supported/],
    [[{ type: "image/jpeg", data: png }], 415, /not a supported/],
    [[{ type: "image/webp", data: Buffer.from("RIFF1234NOPE") }], 415, /not a supported/],
    [[{ type: "image/png", data: Buffer.alloc(0) }], 415, /not a supported/],
    [[{ type: "image/jpeg", data: Buffer.from([255, 0, 255]) }], 415, /not a supported/],
    [[{ type: "image/jpeg", data: Buffer.from([255, 216, 0]) }], 415, /not a supported/],
    [[{ type: "image/png", data: Buffer.alloc(2 * 1024 * 1024 + 1) }], 413, /File too large/],
    [[{ name: "wrong", data: png }], 400, /Unexpected (?:file )?field/],
    [[{ data: png }, { data: png }], 400, /Too many files/],
  ]) {
    const upload = multipart(parts);
    expectError(await request("POST", "/api/user/profile-photo", upload.body, { headers: upload.headers }), status, message);
  }
});

test("POST /api/user/profile-photo forwards malformed multipart errors", async (t) => {
  const request = await api(t);
  expectError(await request("POST", "/api/user/profile-photo", Buffer.from("invalid"), { headers: { "Content-Type": "multipart/form-data; boundary=missing" } }), 500, /Unexpected end of form/);
});

test("profile-photo endpoints handle missing photos, removal, and database errors", async (t) => {
  const request = await api(t);
  expectError(await request("GET", "/api/user/profile-photo"), 404, /No profile photo/);
  stub(t, User, "findById", { ...actor, profilePhoto: { data: png } });
  expectError(await request("GET", "/api/user/profile-photo"), 404, /No profile photo/);
  const update = stub(t, User, "updateOne", { matchedCount: 1 });
  const removed = await request("DELETE", "/api/user/profile-photo");
  assert.equal(removed.body.hasProfilePhoto, false);
  assert.deepEqual(update.mock.calls[0].arguments, [{ _id: ids.actor }, { $unset: { profilePhoto: 1 } }]);
  reject(t, User, "updateOne");
  expectError(await request("DELETE", "/api/user/profile-photo"), 500, /Database unavailable/);
  const upload = multipart([{ data: png }]);
  expectError(await request("POST", "/api/user/profile-photo", upload.body, { headers: upload.headers }), 500, /Database unavailable/);
});
