const { test } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const { User, Item, Customer, Bill, ids } = require("./helpers");

test("User validates credentials and supplies regular, active account defaults", async () => {
  const user = new User({ name: "Test User", email: " test@example.com ", password: "secret123" });
  await user.validate();
  assert.equal(user.email, "test@example.com");
  assert.equal(user.role, "user");
  assert.equal(user.isActive, true);
  assert.equal(user.profilePhoto, undefined);
  for (const values of [
    {}, { name: "Test", email: "invalid", password: "secret123" },
    { name: "Test", email: "test@example.com", password: "short" },
    { name: "Test", email: "test@example.com", password: "x".repeat(24) },
    { name: "Test", email: "test@example.com", password: "secret123", role: "owner" },
    { name: "Test", email: "test@example.com", password: "secret123", profilePhoto: { data: Buffer.from("a"), contentType: "text/plain" } },
  ]) await assert.rejects(new User(values).validate(), { name: "ValidationError" });
});

test("User save hashes new passwords, preserves hashes on profile edits and hashes replacements", async (t) => {
  // Only the driver's write is replaced: Mongoose validation, save hooks and timestamps run.
  const insert = t.mock.method(User.collection, "insertOne", async (doc) => ({ acknowledged: true, insertedId: doc._id }));
  const update = t.mock.method(User.collection, "updateOne", async () => ({ acknowledged: true, matchedCount: 1, modifiedCount: 1 }));
  const user = new User({ name: "Test User", email: "test@example.com", password: "secret123" });
  await user.save();
  assert.notEqual(user.password, "secret123");
  assert.equal(await bcrypt.compare("secret123", user.password), true);
  assert.equal(insert.mock.callCount(), 1);
  assert.ok(user.createdAt instanceof Date);
  assert.ok(user.updatedAt instanceof Date);
  const originalHash = user.password;
  user.name = "Updated Name";
  await user.save({ validateModifiedOnly: true });
  assert.equal(user.password, originalHash);
  user.password = "changed123";
  await user.save({ validateModifiedOnly: true });
  assert.notEqual(user.password, originalHash);
  assert.equal(await bcrypt.compare("changed123", user.password), true);
  assert.equal(update.mock.callCount(), 2);
});

test("Item validates stock, prices, movement types and attribution defaults", async () => {
  const item = new Item({ itemName: " Product ", quantity: 0, ppp: 0 });
  await item.validate();
  assert.equal(item.itemName, "Product");
  assert.equal(item.manufacturer, "Rajwada");
  assert.equal(item.isActive, true);
  assert.equal(item.stockMovements.length, 0);
  const restocked = new Item({ itemName: "Product", quantity: 3, ppp: 1, createdBy: ids.actor, stockMovements: [{ movementType: "restock", quantity: 3, performedBy: ids.actor }] });
  await restocked.validate();
  assert.ok(restocked.stockMovements[0].createdAt instanceof Date);
  assert.ok(restocked.stockMovements[0].performedBy.equals(ids.actor));
  assert.equal(restocked.stockMovements[0]._id, undefined);
  for (const values of [
    {}, { itemName: "Product", quantity: -1, ppp: 1 }, { itemName: "Product", quantity: 1, ppp: -1 },
    { itemName: "Product", quantity: 1, ppp: 1, stockMovements: [{ movementType: "sale", quantity: 1 }] },
    { itemName: "Product", quantity: 1, ppp: 1, stockMovements: [{ movementType: "restock", quantity: 0 }] },
  ]) await assert.rejects(new Item(values).validate(), { name: "ValidationError" });
});

test("Customer validates identity, normalizes contact fields and preserves optional fields", async () => {
  const customer = new Customer({ customerName: " Customer ", normalizedName: "customer", email: " TEST@EXAMPLE.COM ", createdBy: ids.actor });
  await customer.validate();
  assert.equal(customer.customerName, "Customer");
  assert.equal(customer.email, "test@example.com");
  assert.equal(customer.companyName, undefined);
  assert.equal(customer.phone, undefined);
  assert.equal(customer.isActive, true);
  assert.ok(customer.createdBy.equals(ids.actor));
  await assert.rejects(new Customer({}).validate(), { name: "ValidationError" });
});

test("Bill validates customer, quantities and prices and retains creation attribution", async () => {
  const values = { customer: ids.customer, createdBy: ids.actor, salesData: [{ item: ids.item, quantity: 2, ppp: 10, price: 20 }], subTotal: 21 };
  const bill = new Bill(values);
  await bill.validate();
  assert.ok(bill.createdBy.equals(ids.actor));
  assert.equal(bill.salesData[0]._id, undefined);
  for (const invalid of [
    {}, { ...values, customer: undefined },
    ...[{ item: undefined }, { quantity: 0 }, { ppp: -1 }, { price: -1 }].map((changes) => ({ ...values, salesData: [{ ...values.salesData[0], ...changes }] })),
  ]) await assert.rejects(new Bill(invalid).validate(), { name: "ValidationError" });
});

test("schema indexes protect customer and item identity and support analytics dates", () => {
  const customerIndexes = Customer.schema.indexes();
  assert.ok(customerIndexes.some(([keys, options]) => keys.normalizedName === 1 && options.unique));
  for (const field of ["email", "phone"]) {
    assert.ok(customerIndexes.some(([keys, options]) => keys[field] === 1 && options.unique && options.partialFilterExpression[field].$type === "string"));
  }
  assert.ok(Item.schema.indexes().some(([keys, options]) => keys.normalizedItemName === 1 && keys.normalizedManufacturer === 1 && options.unique));
  assert.ok(Bill.schema.indexes().some(([keys]) => keys.createdAt === 1));
});
