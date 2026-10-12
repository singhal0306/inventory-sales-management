const Bill = require("../modals/BillingModal");
const Item = require("../modals/itemModal");

const DAY = 86400000;
const OFFSET = 330 * 60000;
const TIMEZONE = "Asia/Kolkata";
const dateKey = (date) => new Date(date.getTime() + OFFSET).toISOString().slice(0, 10);
const invalid = (message) => Object.assign(new Error(message), { statusCode: 400 });
const money = (value) => Math.round((Number(value) || 0) * 100) / 100;

const parseDate = (value, name) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw invalid(`${name} must be YYYY-MM-DD.`);
  const utc = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(utc.getTime()) || utc.toISOString().slice(0, 10) !== value) throw invalid(`Invalid ${name}.`);
  return new Date(utc.getTime() - OFFSET);
};

const summaryStage = {
  $group: {
    _id: null,
    sales: { $sum: { $sum: "$salesData.price" } },
    billed: { $sum: "$subTotal" },
    units: { $sum: { $sum: "$salesData.quantity" } },
    bills: { $sum: 1 },
  },
};
const summarize = (value = {}) => ({
  sales: money(value.sales), billed: money(value.billed),
  additions: money((value.billed || 0) - (value.sales || 0)),
  bills: value.bills || 0, units: value.units || 0,
  averageBill: value.bills ? money(value.billed / value.bills) : 0,
});

async function buildSalesReport(query) {
  const now = new Date();
  const today = dateKey(now);
  const allTime = query.allTime === "true";
  let start;
  let end;
  let previousStart;
  let previousEnd;
  if (allTime) {
    const first = await Bill.findOne({ createdAt: { $type: "date", $lte: now } }).sort({ createdAt: 1 }).select("createdAt").lean();
    start = parseDate(first ? dateKey(first.createdAt) : today, "from");
    end = now;
  } else {
    start = parseDate(query.from, "from");
    const lastDay = parseDate(query.to, "to");
    if (lastDay < start) throw invalid("End date must be on or after start date.");
    if (query.to > today) throw invalid("End date cannot be in the future.");
    const calendarDuration = lastDay.getTime() + DAY - start.getTime();
    end = new Date(Math.min(lastDay.getTime() + DAY, now.getTime()));
    previousStart = new Date(start.getTime() - calendarDuration);
    // If today is included, compare the same elapsed portion of the prior period.
    previousEnd = new Date(previousStart.getTime() + end.getTime() - start.getTime());
  }
  const page = Number(query.page || 1);
  if (!Number.isInteger(page) || page < 1) throw invalid("Page must be a positive integer.");
  const sorts = ["sales", "quantity", "name", "lastSale", "stock"];
  const sort = query.sort || "sales";
  if (!sorts.includes(sort)) throw invalid("Invalid product sort.");
  const search = typeof query.search === "string" ? query.search.trim().toLowerCase() : "";
  const matchCurrent = { createdAt: { $gte: start, $lt: end } };
  const unit = (end - start) / DAY > 90 ? "month" : "day";
  const format = unit === "month" ? "%Y-%m" : "%Y-%m-%d";
  const [aggregated, items] = await Promise.all([
    Bill.aggregate([
      { $match: { createdAt: { $gte: previousStart || start, $lt: end } } },
      { $facet: {
        current: [{ $match: matchCurrent }, summaryStage],
        previous: allTime ? [{ $match: { _id: { $exists: false } } }] : [
          { $match: { createdAt: { $gte: previousStart, $lt: previousEnd } } }, summaryStage,
        ],
        trend: [
          { $match: matchCurrent },
          { $group: {
            _id: { $dateToString: { date: "$createdAt", format, timezone: TIMEZONE } },
            sales: { $sum: { $sum: "$salesData.price" } },
            billed: { $sum: "$subTotal" }, bills: { $sum: 1 },
          } },
        ],
        products: [
          { $match: matchCurrent }, { $unwind: "$salesData" },
          { $group: {
            _id: { item: "$salesData.item", bill: "$_id" }, quantity: { $sum: "$salesData.quantity" },
            sales: { $sum: "$salesData.price" }, lastSale: { $max: "$createdAt" },
          } },
          { $group: {
            _id: "$_id.item", quantity: { $sum: "$quantity" }, sales: { $sum: "$sales" },
            lastSale: { $max: "$lastSale" }, bills: { $sum: 1 },
          } },
        ],
      } },
    ]).allowDiskUse(true),
    Item.find().select("itemName manufacturer quantity isActive").lean(),
  ]);
  const data = aggregated[0] || { current: [], previous: [], trend: [], products: [] };
  const summary = summarize(data.current[0]);
  const totals = new Map(data.products.map((entry) => [String(entry._id), entry]));
  const products = items.map((item) => {
    const entry = totals.get(String(item._id)) || {};
    totals.delete(String(item._id));
    return {
      id: String(item._id), name: item.itemName, manufacturer: item.manufacturer,
      stock: item.quantity, isActive: item.isActive !== false,
      quantity: entry.quantity || 0, sales: money(entry.sales), bills: entry.bills || 0,
      lastSale: entry.lastSale || null,
    };
  });
  for (const [id, entry] of totals) products.push({
    id, name: "Item unavailable", manufacturer: "", stock: null, isActive: false,
    quantity: entry.quantity, sales: money(entry.sales), bills: entry.bills, lastSale: entry.lastSale,
  });
  const filtered = products.filter((entry) => `${entry.name} ${entry.manufacturer}`.toLowerCase().includes(search));
  filtered.forEach((entry) => { entry.share = summary.sales ? money(entry.sales / summary.sales * 100) : 0; });
  filtered.sort((a, b) => {
    const difference = sort === "name" ? a.name.localeCompare(b.name)
      : sort === "lastSale" ? new Date(b.lastSale || 0) - new Date(a.lastSale || 0)
      : Number(b[sort] || 0) - Number(a[sort] || 0);
    return difference || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
  });
  const buckets = new Map(data.trend.map((entry) => [entry._id, entry]));
  const trend = [];
  const cursor = new Date(start.getTime() + OFFSET);
  if (unit === "month") cursor.setUTCDate(1);
  while (cursor.getTime() - OFFSET < end.getTime()) {
    const key = cursor.toISOString().slice(0, unit === "month" ? 7 : 10);
    const entry = buckets.get(key) || {};
    trend.push({ date: key, sales: money(entry.sales), billed: money(entry.billed), bills: entry.bills || 0 });
    if (unit === "month") cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  const pageSize = 20;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  return {
    range: { from: dateKey(start), to: allTime ? today : query.to, timezone: TIMEZONE, unit, allTime,
      previousFrom: previousStart || null, previousTo: previousEnd || null, generatedAt: now },
    summary, previous: allTime ? null : summarize(data.previous[0]), trend,
    products: { rows: filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize), total: filtered.length, page: currentPage, pages, pageSize },
    exportProducts: filtered,
  };
}

module.exports = { buildSalesReport };
