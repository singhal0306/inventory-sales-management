import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

const SalesDetails = () => {
  const bills = useSelector((state) => state.bills.bills);
  const loading = useSelector((state) => state.bills.loading);
  const error = useSelector((state) => state.bills.error);
  const [view, setView] = useState("items");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const salesRows = useMemo(
    () => bills.flatMap((bill) =>
      (bill.salesData || []).map((line, index) => {
        const item = line.item;
        const itemName = item?.itemName || line.itemName || "Item unavailable";
        const manufacturer = item?.manufacturer || line.manufacturer || "";
        return {
          key: `${bill._id}-${item?._id || item || index}-${index}`,
          itemId: String(item?._id || item || line._id || `${itemName}-${manufacturer}`),
          billId: bill._id,
          customerName: bill.customer?.customerName || bill.customerName || "Customer unavailable",
          companyName: bill.customer?.companyName || "",
          itemName,
          manufacturer,
          quantity: Number(line.quantity) || 0,
          ppp: Number(line.ppp) || 0,
          price: Number(line.price) || 0,
          createdAt: bill.createdAt,
        };
      })
    ),
    [bills]
  );

  const searchQuery = searchTerm.trim().toLowerCase();
  const matchesDateRange = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    if (fromDate && date < new Date(`${fromDate}T00:00:00`)) return false;
    if (toDate && date > new Date(`${toDate}T23:59:59.999`)) return false;
    return true;
  };

  const visibleSalesRows = salesRows.filter((row) => {
    const searchableText = `${row.itemName} ${row.manufacturer} ${row.customerName} ${row.companyName} ${row.billId}`.toLowerCase();
    return searchableText.includes(searchQuery) && matchesDateRange(row.createdAt);
  });

  const productCards = Array.from(
    visibleSalesRows.reduce((products, row) => {
      const product = products.get(row.itemId) || {
        itemId: row.itemId,
        itemName: row.itemName,
        manufacturer: row.manufacturer,
        unitsSold: 0,
        saleCount: 0,
        revenue: 0,
        customerNames: new Set(),
      };
      product.unitsSold += row.quantity;
      product.saleCount += 1;
      product.revenue += row.price;
      product.customerNames.add(row.customerName);
      products.set(row.itemId, product);
      return products;
    }, new Map()).values()
  ).sort((left, right) => right.unitsSold - left.unitsSold || left.itemName.localeCompare(right.itemName));

  const selectedProduct = productCards.find((product) => product.itemId === selectedItemId);
  const selectedRows = visibleSalesRows
    .filter((row) => row.itemId === selectedItemId)
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  const visibleBills = bills.filter((bill) => {
    const lineText = (bill.salesData || []).map((line) =>
      `${line.item?.itemName || line.itemName || ""} ${line.item?.manufacturer || line.manufacturer || ""}`
    ).join(" ");
    const searchableText = `${bill.customer?.customerName || bill.customerName || ""} ${bill.customer?.companyName || ""} ${bill._id || ""} ${lineText}`.toLowerCase();
    return searchableText.includes(searchQuery) && matchesDateRange(bill.createdAt);
  });

  const unitsSold = visibleSalesRows.reduce((total, row) => total + row.quantity, 0);
  const lineRevenue = visibleSalesRows.reduce((total, row) => total + row.price, 0);
  const visibleBillIds = new Set(visibleSalesRows.map((row) => row.billId));

  return (
    <main className="col-span-12 min-w-0 px-4 py-6 sm:px-6 lg:col-span-10 lg:px-8">
      <div className="mx-auto w-full max-w-screen-xl">
        <header className="mb-6 border-b border-slate-200 pb-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Point of sale
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Sales history</h1>
          <p className="mt-1 text-sm text-slate-500">
            Choose a product to see who bought it and when.
          </p>
        </header>

        <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Units sold", value: unitsSold },
            { label: "Products sold", value: productCards.length },
            { label: "Bills", value: visibleBillIds.size },
          ].map((metric) => (
            <article key={metric.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">{metric.label}</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{metric.value}</p>
            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  {view === "items" ? "Products sold" : "Completed bills"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {view === "items"
                    ? `${formatCurrency(lineRevenue)} across ${productCards.length} products`
                    : `${visibleBills.length} bills for this selection`}
                </p>
              </div>
              <div className="inline-flex w-fit rounded-md border border-slate-200 bg-slate-50 p-1" aria-label="Sales history view">
                <button
                  type="button"
                  aria-pressed={view === "items"}
                  onClick={() => setView("items")}
                  className={`rounded px-3 py-1.5 text-sm font-medium ${view === "items" ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-white"}`}
                >
                  Products
                </button>
                <button
                  type="button"
                  aria-pressed={view === "bills"}
                  onClick={() => setView("bills")}
                  className={`rounded px-3 py-1.5 text-sm font-medium ${view === "bills" ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-white"}`}
                >
                  Bills
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(14rem,1fr)_auto_auto] sm:items-end">
              <div>
                <label htmlFor="sales-history-search" className="mb-1 block text-xs font-medium text-slate-600">
                  Search product, customer, or bill
                </label>
                <input
                  id="sales-history-search"
                  type="search"
                  placeholder="Search sales"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label htmlFor="sales-from-date" className="mb-1 block text-xs font-medium text-slate-600">From</label>
                <input
                  id="sales-from-date"
                  type="date"
                  value={fromDate}
                  max={toDate || undefined}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label htmlFor="sales-to-date" className="mb-1 block text-xs font-medium text-slate-600">To</label>
                <input
                  id="sales-to-date"
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(event) => setToDate(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <p className="p-8 text-center text-sm text-slate-500">Loading sales history...</p>
          ) : error ? (
            <p className="p-8 text-center text-sm text-red-700">Sales history could not be loaded.</p>
          ) : view === "items" ? (
            productCards.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">
                {salesRows.length ? "No product sales match these filters." : "No item sales recorded yet."}
              </p>
            ) : (
              <div className="space-y-5 p-4 sm:p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {productCards.map((product) => (
                    <button
                      key={product.itemId}
                      type="button"
                      aria-pressed={selectedItemId === product.itemId}
                      onClick={() => setSelectedItemId(product.itemId)}
                      className={`rounded-md border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        selectedItemId === product.itemId
                          ? "border-emerald-600 bg-emerald-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold text-slate-900">{product.itemName}</h3>
                          <p className="mt-1 truncate text-sm text-slate-500">{product.manufacturer || " "}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
                          {product.unitsSold} sold
                        </span>
                      </div>
                      <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-200/80 pt-3">
                        <div>
                          <p className="text-xs text-slate-500">Buyers</p>
                          <p className="mt-0.5 font-medium text-slate-800">{product.customerNames.size}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Sales total</p>
                          <p className="mt-0.5 font-semibold text-slate-900">{formatCurrency(product.revenue)}</p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs font-medium text-emerald-700">View buyers and dates <span aria-hidden="true">&rarr;</span></p>
                    </button>
                  ))}
                </div>

              </div>
            )
          ) : visibleBills.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              {bills.length ? "No bills match these filters." : "No completed bills yet."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Bill</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Created by</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 text-right font-medium">Amount</th>
                    <th className="px-5 py-3 text-right font-medium">&nbsp;</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleBills.map((bill) => (
                    <tr key={bill._id} className="transition hover:bg-emerald-50/40">
                      <td className="px-5 py-4 font-medium text-slate-800">
                        #{String(bill._id).slice(-6).toUpperCase()}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {bill.customer?.customerName || bill.customerName || "Customer unavailable"}
                      </td>
                      <td className="px-5 py-4 text-slate-700">{bill.createdBy?.name || "Not recorded"}</td>
                      <td className="px-5 py-4 text-slate-500">{formatDate(bill.createdAt)}</td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-900">
                        {formatCurrency(bill.subTotal)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          to={`/purchase-details/${bill._id}`}
                          className="whitespace-nowrap font-medium text-emerald-700 hover:text-emerald-900"
                        >
                          Open bill <span aria-hidden="true">&rarr;</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <Dialog
          open={Boolean(selectedProduct && view === "items")}
          onClose={() => setSelectedItemId("")}
          className="relative z-50"
        >
          <div className="fixed inset-0 bg-slate-950/40" aria-hidden="true" />
          <div className="fixed inset-0 overflow-y-auto sm:p-6">
            <div className="flex min-h-full items-end justify-center sm:items-center">
              <Dialog.Panel className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-xl bg-white shadow-xl sm:rounded-lg">
                <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Product sales</p>
                    <Dialog.Title className="mt-1 truncate text-lg font-semibold text-slate-900">
                      {selectedProduct?.itemName}
                    </Dialog.Title>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedProduct?.unitsSold} units sold to {selectedProduct?.customerNames.size} {selectedProduct?.customerNames.size === 1 ? "buyer" : "buyers"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-start gap-3">
                    <span className="hidden pt-2 text-sm font-semibold text-emerald-800 sm:block">
                      {formatCurrency(selectedProduct?.revenue)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedItemId("")}
                      aria-label="Close product sales"
                      title="Close"
                      className="rounded-md p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                </header>
                <div className="overflow-y-auto">
                  {selectedRows.length === 0 ? (
                    <p className="p-6 text-sm text-slate-500">No sales for this product match the selected filters.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="bg-white text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-4 py-3 font-medium sm:px-6">Sold to</th>
                            <th className="px-4 py-3 text-right font-medium">Quantity</th>
                            <th className="px-4 py-3 text-right font-medium">Unit price</th>
                            <th className="px-4 py-3 text-right font-medium">Line total</th>
                            <th className="px-4 py-3 font-medium">Date and time</th>
                            <th className="px-4 py-3 text-right font-medium sm:pr-6">Bill</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedRows.map((row) => (
                            <tr key={row.key} className="hover:bg-emerald-50/30">
                              <td className="px-4 py-3 sm:px-6">
                                <p className="font-medium text-slate-800">{row.customerName}</p>
                                {row.companyName && <p className="text-xs text-slate-500">{row.companyName}</p>}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-700">{row.quantity}</td>
                              <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(row.ppp)}</td>
                              <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(row.price)}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(row.createdAt)}</td>
                              <td className="px-4 py-3 text-right sm:pr-6">
                                <Link
                                  to={`/purchase-details/${row.billId}`}
                                  onClick={() => setSelectedItemId("")}
                                  className="font-medium text-emerald-700 hover:text-emerald-900"
                                  aria-label={`Open bill ${String(row.billId).slice(-6)}`}
                                >
                                  #{String(row.billId).slice(-6).toUpperCase()}
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 sm:hidden">
                  <span className="text-sm text-slate-500">Sales total</span>
                  <span className="font-semibold text-emerald-800">{formatCurrency(selectedProduct?.revenue)}</span>
                </footer>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </div>
    </main>
  );
};

export default SalesDetails;
