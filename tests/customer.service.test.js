const { test } = require("node:test");
const assert = require("node:assert/strict");
const { ids, stub, document, Customer } = require("./helpers");
const { resolveCustomer, normalizeCustomerName, normalizeEmail, normalizePhone } = require("../services/customerService");
const payload = { customerName: " Test  Customer ", actorId: ids.actor };
const record = (values = {}) => document({ _id: ids.customer, customerName: "Test Customer", normalizedName: "test customer", ...values });
const rejects = (body, status, message) => assert.rejects(resolveCustomer(body), (error) => error.statusCode === status && message.test(error.message));

test("customer normalization handles whitespace, case, missing contact fields and formatted phones", () => {
  assert.equal(normalizeCustomerName("  A   B "), "a b");
  assert.equal(normalizeCustomerName(), "");
  assert.equal(normalizeEmail(" TEST@EXAMPLE.COM "), "test@example.com");
  assert.equal(normalizeEmail(), undefined);
  assert.equal(normalizePhone("+91 (123).456-7890"), "+911234567890");
  assert.equal(normalizePhone(), undefined);
});

test("resolveCustomer creates an attributed customer with normalized optional contacts", async (t) => {
  stub(t, Customer, "findOne", null);
  const save = t.mock.method(Customer.prototype, "save", async function () { return this; });
  const customer = await resolveCustomer({ ...payload, companyName: "  Test   Company ", email: " TEST@EXAMPLE.COM ", phone: "123-456" });
  assert.equal(customer.customerName, "Test Customer");
  assert.equal(customer.normalizedName, "test customer");
  assert.equal(customer.email, "test@example.com");
  assert.equal(customer.phone, "123456");
  assert.equal(customer.companyName, "Test Company");
  assert.ok(customer.createdBy.equals(ids.actor));
  assert.equal(save.mock.callCount(), 1);
});

test("resolveCustomer uses selected IDs and rejects missing, mismatched or archived customers", async (t) => {
  await rejects({}, 400, /name is required/);
  await rejects({ ...payload, customerId: "invalid" }, 400, /Invalid customer ID/);
  stub(t, Customer, "findById", null);
  await rejects({ ...payload, customerId: String(ids.customer) }, 404, /not found/);
  stub(t, Customer, "findById", record({ normalizedName: "other" }));
  await rejects({ ...payload, customerId: String(ids.customer) }, 409, /selection changed/);
  stub(t, Customer, "findById", record({ isActive: false }));
  await rejects({ ...payload, customerId: String(ids.customer) }, 409, /archived/);
  const customer = record();
  stub(t, Customer, "findById", customer);
  assert.equal(await resolveCustomer({ ...payload, customerId: String(ids.customer) }), customer);
});

for (const [field, stored, supplied, message] of [
  ["email", "existing@example.com", "different@example.com", /different email/],
  ["phone", "123456", "654321", /different phone/],
  ["companyName", "Existing Company", "Other Company", /different company/],
]) test(`resolveCustomer rejects conflicting ${field} instead of overwriting it`, async (t) => {
  stub(t, Customer, "findOne", record({ [field]: stored }));
  await rejects({ ...payload, [field]: supplied }, 409, message);
});

test("resolveCustomer fills absent contacts and attributes updates while preserving the creator", async (t) => {
  const customer = record({ createdBy: ids.other });
  stub(t, Customer, "findOne", customer);
  await resolveCustomer({ ...payload, companyName: "Test Company", email: "test@example.com", phone: "123-456" });
  assert.equal(customer.email, "test@example.com");
  assert.equal(customer.phone, "123456");
  assert.equal(customer.companyName, "Test Company");
  assert.equal(customer.updatedBy, ids.actor);
  assert.equal(customer.createdBy, ids.other);
  customer.updatedBy = ids.other;
  await resolveCustomer({ ...payload, companyName: "TEST COMPANY", email: "test@example.com", phone: "123456" });
  assert.equal(customer.updatedBy, ids.other);
  assert.equal(customer.companyName, "Test Company");
  await resolveCustomer(payload);
  assert.equal(customer.updatedBy, ids.other);
});

test("resolveCustomer maps duplicate races and preserves other save errors", async (t) => {
  stub(t, Customer, "findOne", null);
  t.mock.method(Customer.prototype, "save", async () => { throw Object.assign(new Error("duplicate"), { code: 11000 }); });
  await rejects(payload, 409, /already exists/);
  const failure = new Error("Save failed");
  t.mock.method(Customer.prototype, "save", async () => { throw failure; });
  await assert.rejects(resolveCustomer(payload), (error) => error === failure);
});
