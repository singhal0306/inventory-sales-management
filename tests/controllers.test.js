const { test } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const { actor, ids, env, stub, reject, document, invoke, User, Item, Customer, Bill } = require("./helpers");
const users = require("../controllers/userController");
const inventory = require("../controllers/inventryController");
const customers = require("../controllers/customerController");
const billing = require("../controllers/billController");
const admin = require("../controllers/adminController");

test("user controllers work without request logging in isolated use", async (t) => {
  env(t, { jwtSecret: "controller-test-secret", nodeEnv: "test", NODE_ENV: "test" });
  stub(t, User, "findOne", null);
  stub(t, User, "create", document(actor));
  let result = await invoke(users.registerUser, { body: { firstName: "Test", lastName: "User", email: "test@example.com", password: "secret123" } });
  assert.equal(result.res.statusCode, 200);
  assert.equal(result.error, undefined);
  const user = document({ ...actor, password: bcrypt.hashSync("secret123", 4) });
  stub(t, User, "findOne", user);
  result = await invoke(users.loginUser, { body: { email: user.email, password: "secret123" } });
  assert.equal(result.res.body.user._id, ids.actor);
  result = await invoke(users.loginUser, { body: { email: user.email, password: "wrong123" } });
  assert.match(result.error.message, /Invalid Credentials/);
  stub(t, User, "findOne", null);
  assert.match((await invoke(users.loginUser, { body: { email: user.email, password: "secret123" } })).error.message, /Invalid Credentials/);
  stub(t, User, "findById", user);
  result = await invoke(users.changePassword, { body: { currentPassword: "secret123", newPassword: "changed123", confirmPassword: "changed123" } });
  assert.equal(result.error, undefined);
  assert.equal(result.res.statusCode, 200);
  assert.equal((await invoke(users.getUser)).res.body, actor);
  assert.equal((await invoke(users.logoutUser)).res.statusCode, 200);
  stub(t, User, "updateOne", { modifiedCount: 1 });
  const buffer = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal((await invoke(users.uploadProfilePhoto, { file: { buffer, mimetype: "image/png" } })).res.body.hasProfilePhoto, true);
  assert.equal((await invoke(users.deleteProfilePhoto)).res.body.hasProfilePhoto, false);
});

test("getUser forwards a response failure and getProfilePhoto handles a concurrently removed user", async (t) => {
  const failure = new Error("Response failed");
  let received;
  await users.getUser({ user: actor }, { status() { throw failure; } }, (error) => { received = error; });
  assert.equal(received, failure);
  stub(t, User, "findById", null);
  const result = await invoke(users.getProfilePhoto);
  assert.equal(result.res.statusCode, 404);
  assert.match(result.error.message, /No profile photo/);
  reject(t, User, "findById");
  assert.match((await invoke(users.getProfilePhoto)).error.message, /Database unavailable/);
});

test("inventory controllers retain attribution without an attached logger", async (t) => {
  const item = document({ _id: ids.item, quantity: 5 });
  stub(t, Item, "findOne", null);
  const create = stub(t, Item, "create", item);
  assert.equal((await invoke(inventory.addtoinventory, { body: { itemName: "Product", quantity: 5, ppp: 1 } })).res.statusCode, 201);
  assert.equal(create.mock.calls[0].arguments[0].createdBy, ids.actor);
  stub(t, Item, "findOne", item);
  assert.equal((await invoke(inventory.addtoinventory, { body: { itemName: "Product", quantity: 5 } })).res.statusCode, 409);
  stub(t, Item, "findOneAndUpdate", item);
  assert.equal((await invoke(inventory.addStock, { params: { id: String(ids.item) }, body: { quantity: 1 } })).res.statusCode, 200);
  stub(t, Item, "findByIdAndUpdate", item);
  for (const handler of [inventory.archiveFromInventory, inventory.restoreToInventory]) {
    assert.equal((await invoke(handler, { params: { id: String(ids.item) } })).res.statusCode, 200);
  }
});

test("customer controllers support creation, editing, archiving, deleting and restoring without logging", async (t) => {
  const customer = document({ _id: ids.customer, customerName: "Customer", normalizedName: "customer" });
  const params = { id: String(ids.customer) };
  const body = { customerName: "Customer" };
  stub(t, Customer, "create", customer);
  assert.equal((await invoke(customers.createCustomer, { body })).res.statusCode, 201);
  stub(t, Customer, "findById", customer);
  stub(t, Customer, "findByIdAndUpdate", customer);
  assert.equal((await invoke(customers.updateCustomer, { params, body })).res.statusCode, 200);
  stub(t, Bill, "exists", { _id: ids.bill });
  assert.equal((await invoke(customers.deleteCustomer, { params })).res.statusCode, 200);
  assert.equal(customer.archivedBy, ids.actor);
  stub(t, Bill, "exists", null);
  assert.equal((await invoke(customers.deleteCustomer, { params })).res.body.message, "Customer deleted");
  assert.equal((await invoke(customers.restoreCustomer, { params })).res.statusCode, 200);
});

test("billing attributes sales without logging and preserves rollback failures on the original error", async (t) => {
  stub(t, Item, "findOneAndUpdate", { _id: ids.item, quantity: 5, ppp: 0 });
  stub(t, Customer, "findOne", document({ _id: ids.customer, customerName: "Customer", normalizedName: "customer" }));
  stub(t, Bill, "create", (values) => document({ _id: ids.bill, ...values }));
  const body = { customerName: "Customer", salesData: [{ itemId: String(ids.item), quantity: 1 }] };
  const result = await invoke(billing.addNewBill, { body });
  assert.equal(result.res.statusCode, 201);
  assert.equal(result.res.body.bill.subTotal, 0);
  assert.equal(result.res.body.bill.createdBy, ids.actor);
  const rollbackError = new Error("Rollback failed");
  reject(t, Item, "updateOne", rollbackError);
  const failed = await invoke(billing.addNewBill, { body: { ...body, customerName: "" } });
  assert.equal(failed.error.statusCode, 400);
  assert.equal(failed.error.rollbackError, rollbackError);
  assert.equal((await invoke(billing.addNewBill, { body: undefined })).error.statusCode, 400);
});

test("admin controller supports isolated updates without request logging", async (t) => {
  stub(t, User, "findByIdAndUpdate", actor);
  const result = await invoke(admin.updateUser, { params: { id: String(ids.other) }, body: { name: "Test", email: "test@example.com", role: "user", isActive: true } });
  assert.equal(result.error, undefined);
  assert.equal(result.res.body.user._id, actor._id);
  assert.equal(result.res.body.user.name, actor.name);
  assert.equal(result.res.body.user.hasProfilePhoto, false);
});
