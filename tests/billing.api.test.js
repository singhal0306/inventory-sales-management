const { test } = require("node:test");
const assert = require("node:assert/strict");
const { api, ids, stub, reject, document, expectError, Item, Bill, Customer } = require("./helpers");
const item = { _id: ids.item, quantity: 7, ppp: 12.5 };
const payload = { customerName: "Test Customer", salesData: [{ _id: String(ids.item), quantity: 2 }] };
const configureCustomer = (t) => stub(t, Customer, "findOne", document({ _id: ids.customer, customerName: "Test Customer", normalizedName: "test customer" }));

test("POST /api/bill/newbill merges duplicate lines, prices from inventory and attributes the bill", async (t) => {
  const request = await api(t);
  configureCustomer(t);
  const stock = stub(t, Item, "findOneAndUpdate", item);
  const create = stub(t, Bill, "create", (data) => document({ _id: ids.bill, ...data }));
  const response = await request("POST", "/api/bill/newbill", { ...payload, createdBy: String(ids.other), subTotal: 1, salesData: [
    { _id: String(ids.item), quantity: 2, ppp: 0, price: 0 }, { itemId: String(ids.item), quantity: "1" },
  ] });
  assert.equal(response.status, 201);
  assert.equal(stock.mock.callCount(), 1);
  assert.deepEqual(stock.mock.calls[0].arguments, [
    { _id: String(ids.item), isActive: { $ne: false }, quantity: { $gte: 3 } }, { $inc: { quantity: -3 } }, { new: true },
  ]);
  assert.deepEqual(create.mock.calls[0].arguments[0], {
    customer: ids.customer, createdBy: ids.actor,
    salesData: [{ item: ids.item, quantity: 3, ppp: 12.5, price: 37.5 }], subTotal: 39.38,
  });
});

for (const [name, body] of [
  ["missing lines", {}], ["non-array lines", { salesData: {} }], ["empty lines", { salesData: [] }],
  ["null line", { salesData: [null] }], ["invalid item ID", { salesData: [{ _id: "invalid", quantity: 1 }] }],
  ...[0, -1, 1.5, "bad", undefined].map((quantity) => [`quantity ${quantity}`, { salesData: [{ itemId: String(ids.item), quantity }] }]),
]) test(`POST /api/bill/newbill rejects ${name} before touching stock`, async (t) => {
  const request = await api(t);
  const stock = stub(t, Item, "findOneAndUpdate", item);
  expectError(await request("POST", "/api/bill/newbill", body), 400, /at least one item|valid item ID/);
  assert.equal(stock.mock.callCount(), 0);
});

test("POST newbill rejects unavailable stock and compensates earlier deductions", async (t) => {
  const request = await api(t);
  let calls = 0;
  stub(t, Item, "findOneAndUpdate", () => ++calls === 1 ? item : null);
  const rollback = stub(t, Item, "updateOne", { modifiedCount: 1 });
  expectError(await request("POST", "/api/bill/newbill", { ...payload, salesData: [...payload.salesData, { itemId: String(ids.other), quantity: 1 }] }), 409, /insufficient stock/);
  assert.deepEqual(rollback.mock.calls[0].arguments, [{ _id: String(ids.item) }, { $inc: { quantity: 2 } }]);
  stub(t, Item, "findOneAndUpdate", null);
  expectError(await request("POST", "/api/bill/newbill", payload), 409, /insufficient stock/);
  assert.equal(rollback.mock.callCount(), 1);
});

test("POST newbill rolls stock back on customer resolution and bill persistence failures", async (t) => {
  const request = await api(t);
  stub(t, Item, "findOneAndUpdate", item);
  const rollback = stub(t, Item, "updateOne", { modifiedCount: 1 });
  expectError(await request("POST", "/api/bill/newbill", { ...payload, customerName: "" }), 400, /Customer name is required/);
  configureCustomer(t);
  reject(t, Bill, "create");
  expectError(await request("POST", "/api/bill/newbill", payload), 500, /Database unavailable/);
  assert.equal(rollback.mock.callCount(), 2);
});

test("POST newbill preserves the original error if stock compensation also fails", async (t) => {
  const request = await api(t);
  stub(t, Item, "findOneAndUpdate", item);
  reject(t, Item, "updateOne", new Error("Rollback failed"));
  expectError(await request("POST", "/api/bill/newbill", { ...payload, customerName: "" }), 400, /Customer name is required/);
});

test("GET /api/bill/allbills returns bills and forwards database failures", async (t) => {
  const request = await api(t);
  const find = stub(t, Bill, "find", [{ _id: ids.bill, createdBy: ids.actor }]);
  const response = await request("GET", "/api/bill/allbills");
  assert.equal(response.status, 200);
  assert.equal(response.body.bills[0].createdBy, String(ids.actor));
  assert.deepEqual(find.queries[0].calls.find((call) => call.method === "sort").args, [{ createdAt: -1 }]);
  assert.deepEqual(find.queries[0].calls.filter((call) => call.method === "populate").map((call) => call.args[0].path), ["customer", "salesData.item", "createdBy"]);
  reject(t, Bill, "find");
  expectError(await request("GET", "/api/bill/allbills"), 500, /Database unavailable/);
});
