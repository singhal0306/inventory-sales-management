import React, { useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

const Home = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const inventoryItems = useSelector((state) => state.inventory.items) || [];
  const items = inventoryItems.filter((item) => item.isActive !== false);
  const loading = useSelector((state) => state.inventory.loading);
  const error = useSelector((state) => state.inventory.error);

  const now = new Date();
  const recentCutoff = new Date(now);
  recentCutoff.setDate(recentCutoff.getDate() - 30);
  const movements = items.flatMap((item) =>
    (item.stockMovements || []).map((movement) => ({ ...movement, itemName: item.itemName, itemId: item._id }))
  );
  const restocks = movements.filter((movement) => movement.movementType === "restock");
  const recentReceived = restocks
    .filter((movement) => {
      const movementDate = new Date(movement.createdAt);
      return movementDate >= recentCutoff && movementDate <= now;
    })
    .reduce((total, movement) => total + Number(movement.quantity || 0), 0);
  const stockUnits = items.reduce((total, item) => total + Number(item.quantity || 0), 0);
  const stockValue = items.reduce(
    (total, item) => total + Number(item.quantity || 0) * Number(item.ppp || 0),
    0
  );
  const lowStockItems = items.filter((item) => Number(item.quantity) <= 5).length;

  const restockStats = new Map();
  restocks.forEach((movement) => {
    const current = restockStats.get(movement.itemId) || {
      itemId: movement.itemId,
      itemName: movement.itemName,
      orderCount: 0,
      unitsReceived: 0,
    };
    current.orderCount += 1;
    current.unitsReceived += Number(movement.quantity || 0);
    restockStats.set(movement.itemId, current);
  });
  const frequentRestocks = Array.from(restockStats.values())
    .sort((left, right) => right.orderCount - left.orderCount || right.unitsReceived - left.unitsReceived)
    .slice(0, 4);
  const visibleItems = items.filter((item) =>
    `${item.itemName || ""} ${item.manufacturer || ""}`
      .toLowerCase()
      .includes(searchTerm.trim().toLowerCase())
  );

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);

  return (
    <main className="col-span-12 min-w-0 px-4 py-6 sm:px-6 lg:col-span-10 lg:px-8">
      <div className="mx-auto w-full max-w-screen-xl">
        <header className="mb-6 border-b border-slate-200 pb-5">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Stock control
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">Inventory overview</h1>
            <p className="mt-1 text-sm text-slate-500">
              Review stock levels and see what has been replenished.
            </p>
          </div>
        </header>

        <section aria-label="Inventory summary" className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Products", value: items.length, detail: "Active inventory" },
            { label: "Units on hand", value: stockUnits, detail: "Current total stock" },
            { label: "Low stock", value: lowStockItems, detail: "5 units or fewer" },
            { label: "Received in 30 days", value: recentReceived, detail: "Units replenished" },
          ].map((metric, index) => (
            <article key={metric.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-sm font-medium text-slate-500">{metric.label}</p>
              <p className={`mt-3 text-2xl font-semibold ${index === 2 && lowStockItems ? "text-amber-700" : "text-slate-900"}`}>
                {metric.value}
              </p>
              <p className="mt-1 text-xs text-slate-400">{metric.detail}</p>
            </article>
          ))}
        </section>

        <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">Products</h2>
                <p className="mt-1 text-sm text-slate-500">Select a product to inspect its stock history.</p>
              </div>
              <label className="sr-only" htmlFor="inventory-search">Search inventory</label>
              <input
                id="inventory-search"
                type="search"
                placeholder="Search products"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-36 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100 sm:w-56"
              />
            </div>

            {loading ? (
              <p className="py-12 text-center text-sm text-slate-500">Loading inventory...</p>
            ) : error ? (
              <p className="py-12 text-center text-sm text-red-700">Inventory could not be loaded.</p>
            ) : visibleItems.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">
                {items.length ? "No products match your search." : "No products have been added yet."}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {visibleItems.map((item) => {
                  const isLow = Number(item.quantity) <= 5;
                  return (
                    <Link
                      key={item._id}
                      to={`/inventory/${item._id}`}
                      className="rounded-md border border-slate-200 p-4 transition hover:border-emerald-500 hover:bg-emerald-50/30 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold text-slate-900">{item.itemName}</h3>
                          <p className="mt-1 truncate text-sm text-slate-500">{item.manufacturer}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${isLow ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
                          {isLow ? "Low stock" : "In stock"}
                        </span>
                      </div>
                      <div className="mt-5 flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
                        <div>
                          <p className="text-xs text-slate-500">On hand</p>
                          <p className="mt-0.5 text-lg font-semibold text-slate-900">{item.quantity} <span className="text-xs font-normal text-slate-500">units</span></p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Unit price</p>
                          <p className="mt-0.5 font-medium text-slate-800">{formatCurrency(item.ppp)}</p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs font-medium text-emerald-700">View stock activity <span aria-hidden="true">&rarr;</span></p>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-5">
              <h2 className="font-semibold text-slate-900">Most frequently restocked</h2>
              <p className="mt-1 text-sm text-slate-500">Based on recorded replenishment orders</p>
            </div>
            {frequentRestocks.length === 0 ? (
              <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">
                Restock activity will appear after you record stock additions.
              </p>
            ) : (
              <div className="space-y-4">
                {frequentRestocks.map((entry, index) => (
                  <Link key={entry.itemId} to={`/inventory/${entry.itemId}`} className="block rounded-md p-2 transition hover:bg-slate-50">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium text-slate-800">{entry.itemName}</span>
                      <span className="shrink-0 text-xs text-slate-500">{entry.orderCount} {entry.orderCount === 1 ? "order" : "orders"}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-600"
                        style={{ width: `${(entry.orderCount / frequentRestocks[0].orderCount) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 text-right text-xs text-slate-500">{entry.unitsReceived} units received</p>
                  </Link>
                ))}
              </div>
            )}
            <div className="mt-5 border-t border-slate-200 pt-4">
              <p className="text-xs text-slate-500">Estimated stock value at listed prices</p>
              <p className="mt-1 text-xl font-semibold text-emerald-800">{formatCurrency(stockValue)}</p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
};

export default Home;
