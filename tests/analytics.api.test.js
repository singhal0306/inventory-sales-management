const { test } = require("node:test");
const assert = require("node:assert/strict");
const { api, ids, stub, reject, expectError, Item, Bill } = require("./helpers");
const { buildSalesReport } = require("../services/analyticsService");
const NOW = Date.parse("2026-10-12T06:30:00.000Z");
const period = { from: "2026-10-10", to: "2026-10-12" };
const route = "/api/analytics/sales?from=2026-10-10&to=2026-10-12";
const empty = () => ({ current: [], previous: [], products: [], trend: [] });
const aggregate = () => ({
  current: [{ sales: 100, billed: 105, bills: 2, units: 4 }],
  previous: [{ sales: 50, billed: 52.5, bills: 1, units: 2 }],
  products: [{ _id: ids.item, quantity: 3, sales: 75, bills: 2, lastSale: new Date("2026-10-11T06:30:00Z") },
    { _id: ids.other, quantity: 1, sales: 25, bills: 1, lastSale: new Date("2026-10-12T05:00:00Z") }],
  trend: [{ _id: "2026-10-11", sales: 75, billed: 78.75, bills: 1 }, { _id: "2026-10-12", sales: 25, billed: 26.25, bills: 1 }],
});
const catalog = () => [
  { _id: ids.item, itemName: "Product", manufacturer: "Maker", quantity: 9, isActive: true },
  { _id: ids.customer, itemName: "Archived", manufacturer: "Maker", quantity: 0, isActive: false },
];
const configure = (t, data = aggregate(), items = catalog()) => {
  const aggregation = stub(t, Bill, "aggregate", [data]);
  stub(t, Item, "find", items);
  return aggregation;
};

test("GET /api/analytics/sales reports totals, zero-filled dates, prior period and unavailable items", async (t) => {
  const request = await api(t);
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  const aggregation = configure(t);
  const response = await request("GET", route);
  assert.equal(response.status, 200);
  assert.equal(response.headers["cache-control"], "no-store");
  assert.deepEqual(response.body.summary, { sales: 100, billed: 105, additions: 5, bills: 2, units: 4, averageBill: 52.5 });
  assert.deepEqual(response.body.previous, { sales: 50, billed: 52.5, additions: 2.5, bills: 1, units: 2, averageBill: 52.5 });
  assert.deepEqual(response.body.trend[0], { date: "2026-10-10", sales: 0, billed: 0, bills: 0 });
  assert.equal(response.body.trend.length, 3);
  assert.equal(response.body.exportProducts, undefined);
  assert.equal(response.body.products.total, 3);
  assert.deepEqual(response.body.products.rows.find((entry) => entry.id === String(ids.other)), {
    id: String(ids.other), name: "Item unavailable", manufacturer: "", stock: null, isActive: false,
    quantity: 1, sales: 25, bills: 1, lastSale: "2026-10-12T05:00:00.000Z", share: 25,
  });
  assert.equal(response.body.range.timezone, "Asia/Kolkata");
  assert.equal(response.body.range.previousFrom, "2026-10-06T18:30:00.000Z");
  assert.equal(response.body.range.previousTo, "2026-10-09T06:30:00.000Z");
  const pipeline = aggregation.mock.calls[0].arguments[0];
  assert.equal(pipeline[0].$match.createdAt.$gte.toISOString(), response.body.range.previousFrom);
  assert.equal(pipeline[0].$match.createdAt.$lt.toISOString(), "2026-10-12T06:30:00.000Z");
  assert.equal(pipeline[1].$facet.current[0].$match.createdAt.$gte.toISOString(), "2026-10-09T18:30:00.000Z");
  assert.equal(pipeline[1].$facet.trend[1].$group._id.$dateToString.timezone, "Asia/Kolkata");
});

test("analytics compares full historical calendar periods and changes long reports to monthly buckets", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  configure(t, empty(), []);
  const day = await buildSalesReport({ from: "2026-10-10", to: "2026-10-11" });
  assert.equal(day.range.previousFrom.toISOString(), "2026-10-07T18:30:00.000Z");
  assert.equal(day.range.previousTo.toISOString(), "2026-10-09T18:30:00.000Z");
  assert.equal(day.range.unit, "day");
  assert.equal(day.products.pages, 1);
  assert.equal(day.summary.averageBill, 0);
  const monthly = await buildSalesReport({ from: "2026-06-15", to: "2026-10-11" });
  assert.equal(monthly.range.unit, "month");
  assert.deepEqual(monthly.trend.map((entry) => entry.date), ["2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
});

test("analytics handles empty aggregation output and all-time reports with or without historical bills", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  stub(t, Bill, "aggregate", []);
  stub(t, Item, "find", []);
  stub(t, Bill, "findOne", null);
  const noBills = await buildSalesReport({ allTime: "true" });
  assert.equal(noBills.range.from, "2026-10-12");
  assert.equal(noBills.range.to, "2026-10-12");
  assert.equal(noBills.range.previousFrom, null);
  assert.equal(noBills.range.previousTo, null);
  assert.equal(noBills.previous, null);
  assert.equal(noBills.summary.sales, 0);
  stub(t, Bill, "findOne", { createdAt: new Date("2026-01-31T19:00:00Z") });
  const history = await buildSalesReport({ allTime: "true" });
  assert.equal(history.range.from, "2026-02-01");
  assert.equal(history.range.unit, "month");
});

for (const [name, query, message] of [
  ["missing start", { to: period.to }, /from must be/],
  ["non-string start", { ...period, from: [] }, /from must be/],
  ["malformed date", { ...period, from: "10-10-2026" }, /from must be/],
  ["impossible day", { ...period, from: "2026-02-30" }, /Invalid from/],
  ["impossible month", { ...period, from: "2026-13-01" }, /Invalid from/],
  ["missing end", { from: period.from }, /to must be/],
  ["reversed dates", { from: "2026-10-11", to: "2026-10-10" }, /on or after/],
  ["future end", { from: period.from, to: "2026-10-13" }, /in the future/],
  ...["0", "-1", "1.5", "bad"].map((page) => [`page ${page}`, { ...period, page }, /positive integer/]),
  ["unsupported sort", { ...period, sort: "password" }, /Invalid product sort/],
]) test(`analytics rejects ${name}`, async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  await assert.rejects(buildSalesReport(query), (error) => error.statusCode === 400 && message.test(error.message));
});

for (const [sort, expectedFirst] of [["sales", "Product"], ["quantity", "Product"], ["name", "Archived"], ["lastSale", "Item unavailable"], ["stock", "Product"]]) {
  test(`analytics supports product sort ${sort}`, async (t) => {
    t.mock.timers.enable({ apis: ["Date"], now: NOW });
    configure(t);
    const report = await buildSalesReport({ ...period, sort });
    assert.equal(report.products.rows[0].name, expectedFirst);
  });
}

test("analytics pagination, search, zero shares, tie-breaking and rounding", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  const items = Array.from({ length: 25 }, (_, index) => ({ _id: String(index).padStart(2, "0"), itemName: "Same", manufacturer: "Maker", quantity: 0 }));
  configure(t, empty(), items.reverse());
  const report = await buildSalesReport({ ...period, page: "99", search: " MAKER ", sort: "quantity" });
  assert.equal(report.products.total, 25);
  assert.equal(report.products.pages, 2);
  assert.equal(report.products.page, 2);
  assert.equal(report.products.rows.length, 5);
  assert.deepEqual(report.products.rows.map((entry) => entry.id), ["20", "21", "22", "23", "24"]);
  assert.equal(report.products.rows[0].share, 0);
  assert.equal(report.products.rows[0].isActive, true);
  assert.equal(report.exportProducts.length, 25);
  assert.equal((await buildSalesReport({ ...period, search: "no matching item" })).products.total, 0);
  assert.equal((await buildSalesReport({ ...period, search: {} })).products.total, 25);
  const data = empty();
  data.current = [{ sales: 1.0051, billed: 1.056, bills: 1, units: 1 }];
  configure(t, data, []);
  const rounded = await buildSalesReport(period);
  assert.equal(rounded.summary.sales, 1.01);
  assert.equal(rounded.summary.billed, 1.06);
});

test("GET sales/export returns all product rows, safe CSV cells and historical comparisons", async (t) => {
  const request = await api(t);
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  const items = catalog();
  items[0].itemName = '=SUM(A1:A2),"quoted"';
  items[0].manufacturer = "+formula";
  items[1].manufacturer = "@formula";
  const data = aggregate();
  data.products[0].sales = 75;
  configure(t, data, items);
  const response = await request("GET", `${route.replace("/sales?", "/sales/export?")}&search=`);
  assert.equal(response.status, 200);
  assert.match(response.headers["content-type"], /text\/csv/);
  assert.match(response.headers["content-disposition"], /sales-2026-10-10-2026-10-12.csv/);
  assert.equal(response.headers["cache-control"], "no-store");
  assert.equal(response.text.charCodeAt(0), 0xfeff);
  assert.ok(response.text.includes('"\'=SUM(A1:A2),""quoted"""'));
  assert.ok(response.text.includes('"\'+formula"'));
  assert.ok(response.text.includes('"\'@formula"'));
  assert.ok(response.text.includes('"Archived/unavailable"'));
  assert.ok(response.text.includes('"Previous start","2026-10-06T18:30:00.000Z"'));
  assert.ok(response.text.includes('"sales","100","50"'));
  assert.ok(response.text.includes('"Date","Sales before additions","Billed total","Bills"'));
});

test("GET sales/export handles all-time absence of comparisons and spreadsheet formula search", async (t) => {
  const request = await api(t);
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  configure(t, empty(), []);
  stub(t, Bill, "findOne", null);
  const response = await request("GET", "/api/analytics/sales/export?allTime=true&search=-formula");
  assert.equal(response.status, 200);
  assert.ok(response.text.includes('"\'-formula"'));
  assert.ok(response.text.includes('"Previous start","N/A"'));
  assert.ok(response.text.includes('"sales","0","N/A"'));
});

test("product search leaves overall totals and trends unchanged", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  configure(t);
  const report = await buildSalesReport({ ...period, search: " archived " });
  assert.equal(report.summary.sales, 100);
  assert.equal(report.previous.sales, 50);
  assert.equal(report.trend.length, 3);
  assert.equal(report.products.total, 1);
  assert.equal(report.products.rows[0].name, "Archived");
});

test("CSV exports every matching product even when the requested page is page two", async (t) => {
  const request = await api(t);
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  const items = Array.from({ length: 25 }, (_, index) => ({
    _id: String(index), itemName: `Item ${String(index).padStart(2, "0")}`, manufacturer: "Maker", quantity: 0,
  }));
  configure(t, empty(), items);
  const response = await request("GET", `${route.replace("/sales?", "/sales/export?")}&page=2&sort=name`);
  assert.equal(response.status, 200);
  for (const item of items) assert.ok(response.text.includes(`"${item.itemName}"`));
});

test("analytics API and CSV propagate validation and database failures", async (t) => {
  const request = await api(t);
  for (const path of ["/api/analytics/sales", "/api/analytics/sales/export"]) {
    expectError(await request("GET", path), 400, /from must be/);
  }
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  configure(t);
  reject(t, Bill, "aggregate");
  expectError(await request("GET", route), 500, /Database unavailable/);
  expectError(await request("GET", route.replace("/sales?", "/sales/export?")), 500, /Database unavailable/);
});
