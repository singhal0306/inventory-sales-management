import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import { ArrowLeftIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { getItems, restockItem } from "../store/inventoryAction";

const InventoryDetails = () => {
  const { itemId } = useParams();
  const dispatch = useDispatch();
  const items = useSelector((state) => state.inventory.items);
  const loading = useSelector((state) => state.inventory.loading);
  const inventoryError = useSelector((state) => state.inventory.error);
  const item = items.find((entry) => entry._id === itemId);
  const [quantity, setQuantity] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    dispatch(getItems(true));
  }, [dispatch]);

  const movements = [...(item?.stockMovements || [])].sort(
    (left, right) => new Date(right.createdAt) - new Date(left.createdAt)
  );
  const restocks = movements.filter((movement) => movement.movementType === "restock");
  const totalReceived = movements.reduce(
    (total, movement) => total + Number(movement.quantity || 0),
    0
  );
  const restockDates = restocks
    .map((movement) => new Date(movement.createdAt))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((left, right) => left - right);
  const averageDaysBetween =
    restockDates.length > 1
      ? restockDates.slice(1).reduce((total, date, index) => {
          return total + (date - restockDates[index]) / (1000 * 60 * 60 * 24);
        }, 0) / (restockDates.length - 1)
      : null;

  const submitRestock = async (event) => {
    event.preventDefault();
    const requestedQuantity = Number(quantity);
    if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
      setError("Enter a positive whole number of units.");
      setMessage("");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      await dispatch(restockItem(itemId, requestedQuantity));
      setQuantity("");
      setMessage("Restock recorded and stock updated.");
    } catch (restockError) {
      setError(restockError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="col-span-12 min-w-0 px-4 py-6 sm:px-6 lg:col-span-10 lg:px-8">
      <div className="mx-auto w-full max-w-screen-xl">
        <Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-900">
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
          Back to inventory
        </Link>

        {loading && !item ? (
          <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Loading inventory item...
          </p>
        ) : inventoryError && !item ? (
          <p className="rounded-lg border border-red-200 bg-white p-8 text-center text-sm text-red-700">
            Inventory item could not be loaded.
          </p>
        ) : !item ? (
          <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Item not found. Return to inventory and try again.
          </p>
        ) : (
          <>
            <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">Inventory item</p>
                <h1 className="truncate text-2xl font-semibold text-slate-900">{item.itemName}</h1>
                <p className="mt-1 text-sm text-slate-500">{item.manufacturer}</p>
              </div>
              <span className={`w-fit rounded-full px-3 py-1 text-sm font-medium ${Number(item.quantity) <= 5 ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
                {item.quantity} units on hand
              </span>
            </header>

            <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[
                {
                  label: "Created",
                  value: item.createdBy?.name || "Not recorded",
                  date: item.createdAt,
                },
                {
                  label: "Last updated",
                  value: item.updatedBy?.name || "Not recorded",
                  date: item.updatedAt,
                },
                ...(item.archivedAt
                  ? [{
                      label: "Archived",
                      value: item.archivedBy?.name || "Not recorded",
                      date: item.archivedAt,
                    }]
                  : []),
                ...(item.restoredAt
                  ? [{
                      label: "Restored",
                      value: item.restoredBy?.name || "Not recorded",
                      date: item.restoredAt,
                    }]
                  : []),
              ].map((entry) => (
                <article key={entry.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{entry.label}</p>
                  <p className="mt-2 font-medium text-slate-900">{entry.value}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {entry.date
                      ? new Date(entry.date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
                      : "Date not recorded"}
                  </p>
                </article>
              ))}
            </section>

            <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Current stock", value: `${item.quantity} units` },
                { label: "Restock orders", value: restocks.length },
                { label: "Units received", value: totalReceived },
                {
                  label: "Average restock interval",
                  value: averageDaysBetween === null ? "Not enough data" : `${averageDaysBetween.toFixed(1)} days`,
                },
              ].map((metric) => (
                <article key={metric.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-500">{metric.label}</p>
                  <p className="mt-3 text-xl font-semibold text-slate-900">{metric.value}</p>
                </article>
              ))}
            </section>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.8fr)]">
              <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4">
                  <h2 className="font-semibold text-slate-900">Stock additions</h2>
                  <p className="mt-1 text-sm text-slate-500">Recorded opening stock and replenishments</p>
                </div>
                {movements.length === 0 ? (
                  <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                    No stock history is available for this item. Additions made before activity tracking was enabled cannot be reconstructed.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[440px] text-left text-sm">
                      <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="pb-3 font-medium">Activity</th>
                          <th className="pb-3 text-right font-medium">Units added</th>
                          <th className="pb-3 text-right font-medium">Recorded by</th>
                          <th className="pb-3 text-right font-medium">Date and time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {movements.map((movement, index) => (
                          <tr key={`${movement.createdAt}-${index}`}>
                            <td className="py-4">
                              <span className="inline-flex items-center gap-2 font-medium text-slate-800">
                                <ArrowDownTrayIcon className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                                {movement.movementType === "initial" ? "Opening stock" : "Restock"}
                              </span>
                            </td>
                            <td className="py-4 text-right font-semibold text-emerald-800">+{movement.quantity}</td>
                            <td className="py-4 text-right text-slate-600">{movement.performedBy?.name || "Not recorded"}</td>
                            <td className="py-4 text-right text-slate-500">
                              {new Date(movement.createdAt).toLocaleString("en-IN", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <aside className="h-fit rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <h2 className="font-semibold text-slate-900">{item.isActive === false ? "Archived item" : "Record a restock"}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {item.isActive === false
                    ? "This item is archived and cannot be restocked or sold until restored."
                    : "Log each received order to keep purchase frequency accurate."}
                </p>
                {item.isActive !== false && <form onSubmit={submitRestock} className="mt-5">
                  <label htmlFor="restock-quantity" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Units received
                  </label>
                  <input
                    id="restock-quantity"
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    placeholder="Enter quantity"
                  />
                  {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
                  {message && <p role="status" className="mt-2 text-sm text-emerald-700">{message}</p>}
                  <button
                    type="submit"
                    disabled={saving}
                    className="mt-4 w-full rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
                  >
                    {saving ? "Recording..." : "Add to stock"}
                  </button>
                </form>}
                <div className="mt-5 border-t border-slate-200 pt-4">
                  <p className="text-xs text-slate-500">Unit selling price</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(item.ppp) || 0)}
                  </p>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default InventoryDetails;
