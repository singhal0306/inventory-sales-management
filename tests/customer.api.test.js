const { test } = require("node:test");
const assert = require("node:assert/strict");
const { api, ids, stub, reject, document, expectError, Customer, Bill } = require("./helpers");
const endpoint = `/api/customer/${ids.customer}`;
const payload = { customerName: " Test   Customer ", companyName: " Test   Company ", email: " TEST@EXAMPLE.COM ", phone: "(123) 456-7890" };
const customer = () => document({ _id: ids.customer, customerName: "Test Customer", normalizedName: "test customer", createdBy: ids.other });

test("GET /api/customer lists active customers and optionally archived customers", async (t) => {
  const request = await api(t);
  const find = stub(t, Customer, "find", [customer()]);
  assert.equal((await request("GET", "/api/customer")).body.customers.length, 1);
  assert.deepEqual(find.mock.calls[0].arguments, [{ isActive: { $ne: false } }]);
  assert.equal((await request("GET", "/api/customer?includeArchived=true")).status, 200);
  assert.deepEqual(find.mock.calls[1].arguments, [{}]);
  reject(t, Customer, "find");
  expectError(await request("GET", "/api/customer"), 500, /Database unavailable/);
});

test("POST /api/customer normalizes contact details and ignores forged attribution", async (t) => {
  const request = await api(t);
  const create = stub(t, Customer, "create", customer());
  assert.equal((await request("POST", "/api/customer", { ...payload, createdBy: String(ids.other) })).status, 201);
  assert.deepEqual(create.mock.calls[0].arguments[0], { customerName: "Test Customer", normalizedName: "test customer", companyName: "Test Company", email: "test@example.com", phone: "1234567890", createdBy: ids.actor });
  assert.equal((await request("POST", "/api/customer", { customerName: "Other" })).status, 201);
  assert.equal(create.mock.calls[1].arguments[0].companyName, undefined);
  expectError(await request("POST", "/api/customer", {}), 400, /name is required/);
});

for (const [name, error, message] of [
  ["duplicate email", Object.assign(new Error("duplicate"), { code: 11000, keyPattern: { email: 1 } }), /already uses this email/],
  ["duplicate without key", Object.assign(new Error("duplicate"), { code: 11000 }), /already exists/],
  ["empty duplicate key", Object.assign(new Error("duplicate"), { code: 11000, keyPattern: {} }), /already exists/],
  ["database failure", new Error("Database unavailable"), /Database unavailable/],
]) test(`POST and PUT /api/customer handle ${name}`, async (t) => {
  const request = await api(t);
  const status = error.code === 11000 ? 409 : 500;
  reject(t, Customer, "create", error);
  expectError(await request("POST", "/api/customer", payload), status, message);
  stub(t, Customer, "findById", customer());
  reject(t, Customer, "findByIdAndUpdate", error);
  expectError(await request("PUT", endpoint, payload), status, message);
});

test("PUT /api/customer/:id updates contact details while preserving createdBy", async (t) => {
  const request = await api(t);
  stub(t, Customer, "findById", customer());
  const update = stub(t, Customer, "findByIdAndUpdate", customer());
  assert.equal((await request("PUT", endpoint, { ...payload, createdBy: String(ids.actor), updatedBy: String(ids.other) })).status, 200);
  assert.deepEqual(update.mock.calls[0].arguments, [String(ids.customer), { $set: { customerName: "Test Customer", normalizedName: "test customer", updatedBy: ids.actor, companyName: "Test Company", email: "test@example.com", phone: "1234567890" } }, { new: true, runValidators: true }]);
  assert.equal((await request("PUT", endpoint, { customerName: "Changed" })).status, 200);
  assert.deepEqual(update.mock.calls[1].arguments[1].$unset, { companyName: 1, email: 1, phone: 1 });
  expectError(await request("PUT", endpoint, {}), 400, /name is required/);
});

for (const [method, suffix] of [["PUT", ""], ["DELETE", ""], ["POST", "/restore"]]) {
  test(`${method} /api/customer/:id${suffix} rejects invalid and absent customers`, async (t) => {
    const request = await api(t);
    expectError(await request(method, `/api/customer/invalid${suffix}`, payload), 400, /Invalid customer ID/);
    stub(t, Customer, "findById", null);
    stub(t, Customer, "findByIdAndUpdate", null);
    expectError(await request(method, `${endpoint}${suffix}`, payload), 404, /Customer not found/);
    reject(t, Customer, method === "POST" ? "findByIdAndUpdate" : "findById");
    expectError(await request(method, `${endpoint}${suffix}`, payload), 500, /Database unavailable/);
  });
}

test("DELETE /api/customer/:id archives billed customers and records who and when", async (t) => {
  const request = await api(t);
  const record = customer();
  const save = t.mock.method(record, "save", async () => record);
  const deleteOne = t.mock.method(record, "deleteOne", async () => record);
  stub(t, Customer, "findById", record);
  const exists = stub(t, Bill, "exists", { _id: ids.bill });
  const response = await request("DELETE", endpoint);
  assert.equal(response.status, 200);
  assert.match(response.body.message, /archived/);
  assert.equal(record.isActive, false);
  assert.equal(record.createdBy, ids.other);
  assert.equal(record.archivedBy, ids.actor);
  assert.equal(record.updatedBy, ids.actor);
  assert.ok(record.archivedAt instanceof Date);
  assert.equal(save.mock.callCount(), 1);
  assert.equal(deleteOne.mock.callCount(), 0);
  assert.deepEqual(exists.mock.calls[0].arguments, [{ customer: ids.customer }]);
});

test("DELETE /api/customer/:id deletes an unreferenced customer and reports persistence errors", async (t) => {
  const request = await api(t);
  const record = customer();
  const deleteOne = t.mock.method(record, "deleteOne", async () => record);
  stub(t, Customer, "findById", record);
  stub(t, Bill, "exists", null);
  assert.equal((await request("DELETE", endpoint)).body.message, "Customer deleted");
  assert.equal(deleteOne.mock.callCount(), 1);
  t.mock.method(record, "deleteOne", async () => { throw new Error("Delete failed"); });
  expectError(await request("DELETE", endpoint), 500, /Delete failed/);
});

test("POST /api/customer/:id/restore records the restoring actor and time", async (t) => {
  const request = await api(t);
  const update = stub(t, Customer, "findByIdAndUpdate", customer());
  assert.equal((await request("POST", `${endpoint}/restore`)).status, 200);
  const [id, changes, options] = update.mock.calls[0].arguments;
  assert.equal(id, String(ids.customer));
  assert.equal(changes.$set.isActive, true);
  assert.equal(changes.$set.restoredBy, ids.actor);
  assert.equal(changes.$set.updatedBy, ids.actor);
  assert.ok(changes.$set.restoredAt instanceof Date);
  assert.deepEqual(options, { new: true });
});
