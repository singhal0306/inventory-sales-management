import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { fetchSalesReport, exportSalesReport } from "../store/analyticsAction";

const DAY = 86400000;
const todayInStore = () => {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};
const shiftDate = (day, days) => new Date(new Date(`${day}T12:00:00Z`).getTime() + days * DAY).toISOString().slice(0, 10);
const preset = (period) => {
  const to = todayInStore();
  let from = shiftDate(to, -29);
  if (period === "today") from = to;
  if (period === "7") from = shiftDate(to, -6);
  if (period === "month") from = `${to.slice(0, 7)}-01`;
  if (period === "lastMonth") {
    const last = shiftDate(`${to.slice(0, 7)}-01`, -1);
    return { from: `${last.slice(0, 7)}-01`, to: last, allTime: false };
  }
  return { from, to, allTime: period === "all" };
};
const currency = (amount) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount || 0);
const number = (value) => new Intl.NumberFormat("en-IN").format(value || 0);
const dateLabel = (value) => new Date(value.length === 7 ? `${value}-01T12:00:00Z` : `${value}T12:00:00Z`).toLocaleDateString("en-IN", { day: value.length === 7 ? undefined : "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const timestamp = (value) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) : "No sales in period";
const compare = (current, previous) => {
  if (previous === 0) return current === 0 ? "No change" : "No previous baseline";
  const change = (current - previous) / previous * 100;
  return `${change > 0 ? "+" : ""}${change.toFixed(1)}% vs previous period`;
};
const inputStyle = "w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";
const buttonStyle = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-emerald-500 hover:text-emerald-800 disabled:opacity-50";

export default function SalesAnalytics() {
  const dispatch = useDispatch();
  const { report, loading, error, exporting, exportError } = useSelector((state) => state.analytics);
  const [filters, setFilters] = useState(() => ({ ...preset("30"), search: "", sort: "sales", page: 1 }));
  const [draft, setDraft] = useState(filters);
  const [filterError, setFilterError] = useState("");
  const [trendMetric, setTrendMetric] = useState("sales");
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => { dispatch(fetchSalesReport(filters)); }, [dispatch, filters]);

  const applyFilters = (event) => {
    event.preventDefault();
    if (!draft.allTime && (!draft.from || !draft.to || draft.from > draft.to || draft.to > todayInStore())) {
      setFilterError("Choose a valid date range ending on or before today.");
      return;
    }
    setFilterError("");
    setFilters({ ...draft, page: 1 });
  };
  const choosePreset = (period) => {
    const next = { ...draft, ...preset(period), page: 1 };
    setFilterError(""); setDraft(next); setFilters(next);
  };
  const summary = report?.summary;
  const maxTrend = Math.max(1, ...(report?.trend || []).map((entry) => entry[trendMetric]));
  const selectedBucket = report?.trend.find((entry) => entry.date === selectedDate);

  return (
    <main className="col-span-12 min-w-0 px-4 py-6 sm:px-6 lg:col-span-10 lg:px-8">
      <div className="mx-auto w-full max-w-screen-xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div><p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">Business reports</p><h1 className="text-2xl font-semibold text-slate-900">Sales analytics</h1><p className="mt-1 text-sm text-slate-500">Review sales, compare periods, and understand product performance.</p></div>
          <button type="button" disabled={!report || loading || !!error || exporting} onClick={() => dispatch(exportSalesReport(filters))} className={`${buttonStyle} inline-flex items-center gap-2`}><ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />{exporting ? "Exporting..." : "Export CSV"}</button>
        </header>

        <section aria-label="Report filters" className="mb-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap gap-2">{[{ id: "today", label: "Today" }, { id: "7", label: "7 days" }, { id: "30", label: "30 days" }, { id: "month", label: "This month" }, { id: "lastMonth", label: "Last month" }, { id: "all", label: "All time" }].map((entry) => <button key={entry.id} type="button" onClick={() => choosePreset(entry.id)} className={buttonStyle}>{entry.label}</button>)}</div>
          <form onSubmit={applyFilters} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.5fr_1fr_auto] xl:items-end">
            <div><label htmlFor="report-from" className="mb-1.5 block text-sm text-slate-700">From</label><input id="report-from" type="date" disabled={draft.allTime} required={!draft.allTime} value={draft.from} max={draft.to || todayInStore()} onChange={(event) => setDraft({ ...draft, from: event.target.value })} className={inputStyle} /></div>
            <div><label htmlFor="report-to" className="mb-1.5 block text-sm text-slate-700">To</label><input id="report-to" type="date" disabled={draft.allTime} required={!draft.allTime} value={draft.to} min={draft.from} max={todayInStore()} onChange={(event) => setDraft({ ...draft, to: event.target.value })} className={inputStyle} /></div>
            <div><label htmlFor="report-search" className="mb-1.5 block text-sm text-slate-700">Product or manufacturer</label><input id="report-search" type="search" value={draft.search} onChange={(event) => setDraft({ ...draft, search: event.target.value })} placeholder="Filter product table" className={inputStyle} /></div>
            <div><label htmlFor="report-sort" className="mb-1.5 block text-sm text-slate-700">Rank products by</label><select id="report-sort" value={draft.sort} onChange={(event) => setDraft({ ...draft, sort: event.target.value })} className={inputStyle}><option value="sales">Sales value</option><option value="quantity">Units sold</option><option value="stock">Current stock</option><option value="lastSale">Latest sale</option><option value="name">Name (A–Z)</option></select></div>
            <button type="submit" className="rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">Apply</button>
          </form>
          <label className="mt-3 flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={draft.allTime} onChange={(event) => setDraft({ ...draft, allTime: event.target.checked })} className="accent-emerald-700" />All time</label>
          <p className="mt-3 text-xs text-slate-500">Dates use Asia/Kolkata. Product search and ranking apply to the product table and exported product rows.</p>
          {filterError && <p role="alert" className="mt-2 text-sm text-red-700">{filterError}</p>}
        </section>
        {exportError && <p role="alert" className="mb-4 text-sm text-red-700">{exportError}</p>}
        {loading || (!report && !error) ? <p role="status" className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Generating report...</p> : error ? <div role="alert" className="rounded-lg border border-red-200 bg-white p-6 text-sm text-red-700">{error}<button type="button" className={`${buttonStyle} ml-3`} onClick={() => dispatch(fetchSalesReport(filters))}>Retry</button></div> : report && (
          <>
            <div className="mb-4 text-sm text-slate-500"><p className="font-medium text-slate-700">{dateLabel(report.range.from)} – {dateLabel(report.range.to)}{report.range.allTime ? " · All time" : ""}</p><p className="mt-1 text-xs">Generated {timestamp(report.range.generatedAt)} IST. {report.previous ? `Compared with ${timestamp(report.range.previousFrom)} to ${timestamp(report.range.previousTo)} (end exclusive); today's comparison uses the same elapsed time.` : "Previous-period comparison is unavailable for all time."}</p></div>
            <section aria-label="Sales summary" className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[
                { key: "sales", label: "Sales before additions", cash: true }, { key: "billed", label: "Billed total", cash: true }, { key: "additions", label: "Bill additions", cash: true },
                { key: "bills", label: "Bills" }, { key: "units", label: "Units sold" }, { key: "averageBill", label: "Average bill", cash: true },
              ].map((entry) => <article key={entry.key} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{entry.label}</p><p className="mt-3 text-2xl font-semibold text-slate-900">{entry.cash ? currency(summary[entry.key]) : number(summary[entry.key])}</p><p className="mt-2 text-xs text-slate-500">{report.previous ? compare(summary[entry.key], report.previous[entry.key]) : "All recorded sales"}</p></article>)}
            </section>
            <p className="mb-5 text-xs leading-5 text-slate-500">Sales are the sum of bill line amounts. Additions are the difference between billed totals and line amounts (currently a 5% addition in billing). Billed totals represent invoices, not payment collections or profit.</p>

            <section className="mb-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-900">Sales trend</h2><p className="mt-1 text-sm text-slate-500">{report.range.unit === "month" ? "Monthly" : "Daily"} totals across the full selected period, including zero-sales dates.</p></div><label className="flex items-center gap-2 text-sm text-slate-600">Show<select value={trendMetric} onChange={(event) => setTrendMetric(event.target.value)} className={inputStyle}><option value="sales">Sales before additions</option><option value="billed">Billed total</option><option value="bills">Bill count</option></select></label></div>
              <div className="overflow-x-auto"><div className="flex items-end gap-3" style={{ minWidth: Math.max(560, report.trend.length * 72) }}>
                {report.trend.map((entry) => (
                  <div key={entry.date} className="min-w-0 flex-1 text-center">
                    <span className="mb-2 block text-xs text-slate-500">{trendMetric === "bills" ? number(entry.bills) : currency(entry[trendMetric])}</span>
                    <div className="flex h-40 items-end justify-center border-b border-slate-200">
                      <button type="button" onClick={() => setSelectedDate(entry.date)} aria-pressed={selectedDate === entry.date}
                        aria-label={`${dateLabel(entry.date)}: ${trendMetric === "bills" ? number(entry.bills) + " bills" : currency(entry[trendMetric])}`}
                        title={`${dateLabel(entry.date)} · ${currency(entry.sales)} sales · ${number(entry.bills)} bills`}
                        className={`w-8 rounded-t hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-800 ${entry[trendMetric] ? "bg-emerald-600" : "bg-slate-200"}`}
                        style={{ height: entry[trendMetric] ? `${Math.max(2, entry[trendMetric] / maxTrend * 100)}%` : 2 }} />
                    </div>
                    <span className="mt-2 block text-xs text-slate-500">{dateLabel(entry.date)}</span>
                  </div>
                ))}
              </div></div>
              {selectedBucket && <p role="status" className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">{dateLabel(selectedBucket.date)} · {currency(selectedBucket.sales)} sales before additions · {currency(selectedBucket.billed)} billed · {number(selectedBucket.bills)} bills</p>}
              <details className="mt-5"><summary className="cursor-pointer text-sm font-medium text-emerald-700">View trend data table</summary><div className="mt-3 max-h-80 overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-slate-500"><tr><th className="p-3">Date</th><th className="p-3">Sales before additions</th><th className="p-3">Billed total</th><th className="p-3">Bills</th></tr></thead><tbody className="divide-y divide-slate-100">{report.trend.map((entry) => <tr key={entry.date}><td className="p-3">{dateLabel(entry.date)}</td><td className="p-3">{currency(entry.sales)}</td><td className="p-3">{currency(entry.billed)}</td><td className="p-3">{entry.bills}</td></tr>)}</tbody></table></div></details>
            </section>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5"><h2 className="font-semibold text-slate-900">Product performance</h2><p className="mt-1 text-sm text-slate-500">{report.products.total} matching products. Includes archived products and products with no sales.</p><p className="mt-1 text-xs text-slate-500">Stock is current, not historical. Last sale is within the selected period. Share is of all sales before additions in this period.</p></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Product", "Units sold", "Sales", "Share", "Bills", "Current stock", "Last sale in period"].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">
                {report.products.rows.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-slate-500">No products match these filters.</td></tr> : report.products.rows.map((entry) => <tr key={entry.id} className="hover:bg-emerald-50/30"><td className="px-4 py-4"><Link to={`/inventory/${entry.id}`} className="font-medium text-emerald-700 hover:underline">{entry.name}</Link><p className="text-xs text-slate-500">{entry.manufacturer}{!entry.isActive ? " · Archived/unavailable" : ""}</p></td><td className="px-4 py-4">{number(entry.quantity)}</td><td className="px-4 py-4 font-medium">{currency(entry.sales)}</td><td className="px-4 py-4">{entry.share.toFixed(2)}%</td><td className="px-4 py-4">{entry.bills}</td><td className="px-4 py-4">{entry.stock ?? "Unavailable"}</td><td className="whitespace-nowrap px-4 py-4 text-slate-500">{timestamp(entry.lastSale)}</td></tr>)}
              </tbody></table></div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-sm text-slate-500"><p>Page {report.products.page} of {report.products.pages} · {report.products.pageSize} per page</p><div className="flex gap-2"><button type="button" disabled={report.products.page <= 1} className={buttonStyle} onClick={() => setFilters({ ...filters, page: report.products.page - 1 })}>Previous</button><button type="button" disabled={report.products.page >= report.products.pages} className={buttonStyle} onClick={() => setFilters({ ...filters, page: report.products.page + 1 })}>Next</button></div></div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
