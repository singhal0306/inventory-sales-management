const { buildSalesReport } = require("../services/analyticsService");

const salesReport = async (req, res, next) => {
  try {
    const { exportProducts, ...report } = await buildSalesReport(req.query);
    res.set("Cache-Control", "no-store");
    res.json(report);
  } catch (error) { next(error); }
};

const csvCell = (value) => {
  let text = String(value ?? "");
  // Spreadsheet imports must treat user-provided names as text, not formulas.
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const exportSales = async (req, res, next) => {
  try {
    const report = await buildSalesReport(req.query);
    const rows = [
      ["Sales report", report.range.from, report.range.to, report.range.timezone],
      ["Generated at", report.range.generatedAt.toISOString()],
      ["Product search (product rows only)", req.query.search || ""],
      ["Metric", "Current", "Previous"],
      ...Object.keys(report.summary).map((key) => [key, report.summary[key], report.previous?.[key] ?? "N/A"]),
      ["Previous start", report.range.previousFrom?.toISOString() || "N/A"],
      ["Previous end (exclusive)", report.range.previousTo?.toISOString() || "N/A"],
      [], ["Date", "Sales before additions", "Billed total", "Bills"],
      ...report.trend.map((entry) => [entry.date, entry.sales, entry.billed, entry.bills]),
      [], ["Product ID", "Product", "Manufacturer", "Status", "Units sold", "Sales before additions", "Share %", "Bills", "Current stock", "Last sale"],
      ...report.exportProducts.map((entry) => [entry.id, entry.name, entry.manufacturer, entry.isActive ? "Active" : "Archived/unavailable", entry.quantity, entry.sales, entry.share, entry.bills, entry.stock, entry.lastSale ? new Date(entry.lastSale).toISOString() : ""]),
    ];
    res.set({ "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="sales-${report.range.from}-${report.range.to}.csv"` });
    res.send(`\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`);
  } catch (error) { next(error); }
};

module.exports = { salesReport, exportSales };
