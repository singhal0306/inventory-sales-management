import React, { useState } from "react";
import { useSelector } from "react-redux";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const SalesAnalytics = () => {
  const [period, setPeriod] = useState("30");
  const bills = useSelector((state) => state.bills.bills);
  const loading = useSelector((state) => state.bills.loading);
  const error = useSelector((state) => state.bills.error);

  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setHours(0, 0, 0, 0);
  if (period !== "all") {
    periodStart.setDate(periodStart.getDate() - Number(period) + 1);
  }

  const filteredBills = bills.filter((bill) => {
    if (period === "all") return true;
    const billDate = new Date(bill.createdAt);
    return !Number.isNaN(billDate.getTime()) && billDate >= periodStart && billDate <= now;
  });

  const grossSales = filteredBills.reduce(
    (total, bill) => total + Number(bill.subTotal || 0),
    0
  );
  const unitsSold = filteredBills.reduce(
    (total, bill) =>
      total + bill.salesData.reduce((itemTotal, item) => itemTotal + Number(item.quantity || 0), 0),
    0
  );
  const averageBill = filteredBills.length ? grossSales / filteredBills.length : 0;

  const trendBuckets = period === "all" ? 6 : Number(period);
  const trendData = Array.from({ length: trendBuckets }, (_, index) => {
    const date = new Date(now);
    let key;
    let label;

    if (period === "all") {
      date.setDate(1);
      date.setMonth(date.getMonth() - (trendBuckets - index - 1));
      key = monthKey(date);
      label = date.toLocaleDateString("en", { month: "short" });
    } else {
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (trendBuckets - index - 1));
      key = dateKey(date);
      label = period === "7" ? date.toLocaleDateString("en", { weekday: "short" }) : String(date.getDate());
    }

    const sales = filteredBills.reduce((total, bill) => {
      const billDate = new Date(bill.createdAt);
      const billKey = period === "all" ? monthKey(billDate) : dateKey(billDate);
      return billKey === key ? total + Number(bill.subTotal || 0) : total;
    }, 0);

    return { key, label, sales };
  });
  const maxTrendSales = Math.max(...trendData.map((entry) => entry.sales), 1);

  const productTotals = new Map();
  filteredBills.forEach((bill) => {
    bill.salesData.forEach((item) => {
      const referencedItem = item.item;
      const productId = referencedItem?._id || referencedItem || item._id;
      const current = productTotals.get(String(productId)) || {
        name: referencedItem?.itemName || item.itemName || "Item unavailable",
        manufacturer: referencedItem?.manufacturer || item.manufacturer || "",
        quantity: 0,
        revenue: 0,
      };
      current.quantity += Number(item.quantity || 0);
      current.revenue += Number(item.price || 0);
      productTotals.set(String(productId), current);
    });
  });
  const topProducts = Array.from(productTotals.values())
    .sort((left, right) => right.quantity - left.quantity)
    .slice(0, 5);
  const maxProductQuantity = Math.max(...topProducts.map((item) => item.quantity), 1);

  const summaryCards = [
    { label: "Gross sales", value: formatCurrency(grossSales), detail: "Bill totals" },
    { label: "Bills", value: filteredBills.length, detail: "Completed sales" },
    { label: "Units sold", value: unitsSold, detail: "Across all products" },
    { label: "Average bill", value: formatCurrency(averageBill), detail: "Per completed sale" },
  ];

  return (
    <main className="col-span-12 min-w-0 px-4 py-6 sm:px-6 lg:col-span-10 lg:px-8">
      <div className="mx-auto w-full max-w-screen-xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Business overview
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">Sales analytics</h1>
            <p className="mt-1 text-sm text-slate-500">Track revenue, bill volume, and product performance.</p>
          </div>
          <div className="inline-flex w-fit rounded-md border border-slate-200 bg-white p-1" aria-label="Sales date range">
            {[{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }, { value: "all", label: "All time" }].map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={period === option.value}
                onClick={() => setPeriod(option.value)}
                className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                  period === option.value
                    ? "bg-emerald-700 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </header>

        {loading ? (
          <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Loading sales analytics...
          </p>
        ) : error ? (
          <p className="rounded-lg border border-red-200 bg-white p-8 text-center text-sm text-red-700">
            Sales analytics could not be loaded.
          </p>
        ) : (
          <>
            <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card, index) => (
                <article key={card.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <p className="text-sm font-medium text-slate-500">{card.label}</p>
                  <p className={`mt-3 text-2xl font-semibold ${index === 0 ? "text-emerald-800" : "text-slate-900"}`}>
                    {card.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{card.detail}</p>
                </article>
              ))}
            </section>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.8fr)]">
              <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-5">
                  <h2 className="font-semibold text-slate-900">Sales trend</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {period === "all" ? "Monthly totals for the last six months" : "Daily bill totals"}
                  </p>
                </div>
                {filteredBills.length === 0 ? (
                  <p className="flex min-h-48 items-center justify-center text-sm text-slate-500">
                    No sales in this period.
                  </p>
                ) : (
                  <div className="overflow-x-auto pb-2">
                    <div className="flex h-56 min-w-[560px] items-end gap-2 border-b border-slate-200 px-1">
                      {trendData.map((entry) => (
                        <div key={entry.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                          <span className="max-w-full truncate text-[10px] text-slate-500">
                            {entry.sales > 0 ? formatCurrency(entry.sales) : ""}
                          </span>
                          <div
                            className="w-full max-w-10 rounded-t bg-emerald-600 transition-all hover:bg-emerald-700"
                            style={{ height: `${Math.max((entry.sales / maxTrendSales) * 100, entry.sales ? 5 : 1)}%` }}
                            title={`${entry.label}: ${formatCurrency(entry.sales)}`}
                          />
                          <span className="h-4 text-[10px] text-slate-500">{entry.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-5">
                  <h2 className="font-semibold text-slate-900">Top products</h2>
                  <p className="mt-1 text-sm text-slate-500">Ranked by units sold</p>
                </div>
                {topProducts.length === 0 ? (
                  <p className="flex min-h-48 items-center justify-center text-sm text-slate-500">
                    No product sales in this period.
                  </p>
                ) : (
                  <div className="space-y-5">
                    {topProducts.map((item, index) => (
                      <div key={`${item.name}-${index}`}>
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800">{item.name}</p>
                            <p className="truncate text-xs text-slate-500">{item.manufacturer}</p>
                          </div>
                          <span className="shrink-0 text-sm font-semibold text-slate-700">
                            {item.quantity} sold
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-600"
                            style={{ width: `${(item.quantity / maxProductQuantity) * 100}%` }}
                          />
                        </div>
                        <p className="mt-1 text-right text-xs text-slate-500">{formatCurrency(item.revenue)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default SalesAnalytics;