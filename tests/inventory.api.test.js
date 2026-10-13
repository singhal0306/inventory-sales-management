const { test } = require("node:test");
const assert = require("node:assert/strict");
const { api, ids, stub, reject, document, expectError, Item } = require("./helpers");
const payload = { itemName: "  Test   Product ", manufacturer: " Test   Maker ", quantity: 5, ppp: 12.5 };
const item = { _id: ids.item, itemName: "Test Product", manufacturer: "Test Maker", quantity: 5, ppp: 12.5 };

test("GET /api/inventory/getitems filters archived items unless requested", async (t) => {
  const request = await api(t);
  const find = stub(t, Item, "find", [item]);
  assert.equal((await request("GET", "/api/inventory/getitems")).body.items.length, 1);
  assert.deepEqual(find.mock.calls[0].arguments, [{ isActive: { $ne: false } }]);
  assert.deepEqual(find.queries[0].calls.filter((call) => call.method === "populate").map((call) => call.args[0].path), ["createdBy", "updatedBy", "archivedBy", "restoredBy", "stockMovements.performedBy"]);
  assert.equal((await request("GET", "/api/inventory/getitems?includeArchived=true")).status, 200);
  assert.deepEqual(find.mock.calls[1].arguments, [{}]);
  reject(t, Item, "find");
  expectError(await request("GET", "/api/inventory/getitems"), 500, /Database unavailable/);
});

test("POST /api/inventory/addtoinventory normalizes identity and attributes initial stock", async (t) => {
  const request = await api(t);
  const find = stub(t, Item, "findOne", null);
  const create = stub(t, Item, "create", document(item));
  const response = await request("POST", "/api/inventory/addtoinventory", { ...payload, createdBy: String(ids.other), updatedBy: String(ids.other) });
  assert.equal(response.status, 201);
  assert.deepEqual(create.mock.calls[0].arguments[0], {
    itemName: "Test Product", manufacturer: "Test Maker", normalizedItemName: "test product", normalizedManufacturer: "test maker",
    quantity: 5, ppp: 12.5, createdBy: ids.actor, updatedBy: ids.actor,
    stockMovements: [{ movementType: "initial", quantity: 5, performedBy: ids.actor }],
  });
  const legacyFilter = find.mock.calls[0].arguments[0].$or[1];
  assert.equal(legacyFilter.itemName.test("  TEST   PRODUCT "), true);
  assert.equal(legacyFilter.manufacturer.test("Test Maker"), true);
});

test("POST addtoinventory supports default manufacturer and treats regex characters literally", async (t) => {
  const request = await api(t);
  const find = stub(t, Item, "findOne", null);
  const create = stub(t, Item, "create", item);
  assert.equal((await request("POST", "/api/inventory/addtoinventory", { ...payload, manufacturer: undefined, itemName: "Box (a+b).*" })).status, 201);
  assert.equal(create.mock.calls[0].arguments[0].manufacturer, "Rajwada");
  const pattern = find.mock.calls[0].arguments[0].$or[1].itemName;
  assert.equal(pattern.test("Box (a+b).*"), true);
  assert.equal(pattern.test("Box aaaa"), false);
});

for (const [name, body, message] of [
  ["missing name", { ...payload, itemName: undefined }, /name and manufacturer/],
  ["blank manufacturer", { ...payload, manufacturer: " " }, /name and manufacturer/],
  ...[0, -1, 1.5, "NaN", undefined].map((quantity) => [`quantity ${quantity}`, { ...payload, quantity }, /positive whole number/]),
]) test(`POST addtoinventory rejects ${name}`, async (t) => {
  const request = await api(t);
  expectError(await request("POST", "/api/inventory/addtoinventory", body), 400, message);
});

test("POST addtoinventory handles duplicate checks, duplicate races and other database errors", async (t) => {
  const request = await api(t);
  stub(t, Item, "findOne", item);
  expectError(await request("POST", "/api/inventory/addtoinventory", payload), 409, /already exists/);
  stub(t, Item, "findOne", null);
  reject(t, Item, "create", Object.assign(new Error("duplicate"), { code: 11000 }));
  expectError(await request("POST", "/api/inventory/addtoinventory", payload), 409, /already exists/);
  reject(t, Item, "create");
  expectError(await request("POST", "/api/inventory/addtoinventory", payload), 500, /Database unavailable/);
});

test("POST /api/inventory/addstock/:id increments active stock and records the actor", async (t) => {
  const request = await api(t);
  const update = stub(t, Item, "findOneAndUpdate", { ...item, quantity: 8 });
  const response = await request("POST", `/api/inventory/addstock/${ids.item}`, { quantity: "3", performedBy: String(ids.other) });
  assert.equal(response.status, 200);
  assert.deepEqual(update.mock.calls[0].arguments, [
    { _id: String(ids.item), isActive: { $ne: false } },
    { $inc: { quantity: 3 }, $push: { stockMovements: { movementType: "restock", quantity: 3, performedBy: ids.actor } }, $set: { updatedBy: ids.actor } },
    { new: true, runValidators: true },
  ]);
});

test("POST addstock rejects invalid quantities, absent/archived items and database failures", async (t) => {
  const request = await api(t);
  for (const quantity of [0, -1, 1.5, "bad"]) {
    expectError(await request("POST", `/api/inventory/addstock/${ids.item}`, { quantity }), 400, /positive whole number/);
  }
  stub(t, Item, "findOneAndUpdate", null);
  expectError(await request("POST", `/api/inventory/addstock/${ids.item}`, { quantity: 1 }), 404, /Item not found/);
  reject(t, Item, "findOneAndUpdate");
  expectError(await request("POST", `/api/inventory/addstock/${ids.item}`, { quantity: 1 }), 500, /Database unavailable/);
});

for (const [action, isActive, actorField, dateField] of [
  ["archive", false, "archivedBy", "archivedAt"], ["restore", true, "restoredBy", "restoredAt"],
]) test(`PATCH /api/inventory/${action}/:id records attribution without deleting history`, async (t) => {
  const request = await api(t);
  const update = stub(t, Item, "findByIdAndUpdate", { ...item, isActive });
  const response = await request("PATCH", `/api/inventory/${action}/${ids.item}`);
  assert.equal(response.status, 200);
  const [id, changes, options] = update.mock.calls[0].arguments;
  assert.equal(id, String(ids.item));
  assert.equal(changes.$set.isActive, isActive);
  assert.equal(changes.$set[actorField], ids.actor);
  assert.equal(changes.$set.updatedBy, ids.actor);
  assert.ok(changes.$set[dateField] instanceof Date);
  assert.equal(changes.$unset, undefined);
  assert.deepEqual(options, { new: true });
  stub(t, Item, "findByIdAndUpdate", null);
  expectError(await request("PATCH", `/api/inventory/${action}/${ids.item}`), 404, /Item not found/);
  reject(t, Item, "findByIdAndUpdate");
  expectError(await request("PATCH", `/api/inventory/${action}/${ids.item}`), 500, /Database unavailable/);
});
