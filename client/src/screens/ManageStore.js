import React, { useEffect, useMemo, useState } from "react";
import { Dialog } from "@headlessui/react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  ArchiveBoxIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUturnLeftIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { archiveItem, getItems, restoreItem } from "../store/inventoryAction";
import AddProduct from "../components/AddProduct";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const ManageStore = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showProductModal, setShowProductModal] = useState(false);
  const [itemToArchive, setItemToArchive] = useState(null);
  const [savingArchive, setSavingArchive] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const dispatch = useDispatch();
  const items = useSelector((state) => state.inventory.items);
  const loading = useSelector((state) => state.inventory.loading);
  const inventoryError = useSelector((state) => state.inventory.error);

  useEffect(() => {
    dispatch(getItems(true));
  }, [dispatch]);

  const activeItems = items.filter((item) => item.isActive !== false);
  const archivedItems = items.filter((item) => item.isActive === false);
  const statusItems = statusFilter === "archived"
    ? archivedItems
    : statusFilter === "all"
      ? items
      : activeItems;
  const visibleItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return statusItems;
    return statusItems.filter((item) =>
      `${item.itemName || ""} ${item.manufacturer || ""}`.toLowerCase().includes(query)
    );
  }, [statusItems, searchTerm]);

  const stockUnits = activeItems.reduce((total, item) => total + Number(item.quantity || 0), 0);
  const lowStockCount = activeItems.filter((item) => Number(item.quantity) <= 5).length;
  const inventoryValue = activeItems.reduce(
    (total, item) => total + Number(item.quantity || 0) * Number(item.ppp || 0),
    0
  );

  const confirmArchive = async () => {
    if (!itemToArchive) return;
    setSavingArchive(true);
    setActionError("");
    setNotice("");
    try {
      const message = await dispatch(archiveItem(itemToArchive._id));
      setNotice(message);
      setItemToArchive(null);
    } catch (error) {
      setActionError(error.message);
    } finally {
      setSavingArchive(false);
    }
  };

  const handleRestore = async (item) => {
    setActionError("");
    setNotice("");
    try {
      const message = await dispatch(restoreItem(item._id));
      setNotice(message);
    } catch (error) {
      setActionError(error.message);
    }
  };

  return (
    <main className="col-span-12 min-w-0 px-4 py-6 sm:px-6 lg:col-span-10 lg:px-8">
      <div className="mx-auto w-full max-w-screen-xl">
        {showProductModal && (
          <AddProduct addProductModalSetting={() => setShowProductModal(false)} />
        )}

        <Dialog
          open={Boolean(itemToArchive)}
          onClose={() => !savingArchive && setItemToArchive(null)}
          className="relative z-50"
        >
          <div className="fixed inset-0 bg-slate-950/40" aria-hidden="true" />
          <div className="fixed inset-0 overflow-y-auto p-4">
            <div className="flex min-h-full items-center justify-center">
              <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl sm:p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-50 text-amber-800">
                  <ArchiveBoxIcon className="h-5 w-5" aria-hidden="true" />
                </div>
                <Dialog.Title className="mt-4 text-lg font-semibold text-slate-900">
                  Archive {itemToArchive?.itemName}?
                </Dialog.Title>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This item will be hidden from the active inventory and new sales. It will not be permanently deleted, so existing bills and stock history will continue to work. You can restore it later.
                </p>
                {actionError && <p role="alert" className="mt-3 text-sm text-red-700">{actionError}</p>}
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={savingArchive}
                    onClick={() => setItemToArchive(null)}
                    className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={savingArchive}
                    onClick={confirmArchive}
                    className="rounded-md bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-wait disabled:opacity-60"
                  >
                    {savingArchive ? "Archiving..." : "Archive item"}
                  </button>
                </div>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>

        <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">Stock control</p>
            <h1 className="text-2xl font-semibold text-slate-900">Manage inventory</h1>
            <p className="mt-1 text-sm text-slate-500">Archive retired items without breaking historical bills.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowProductModal(true)}
            className="inline-flex w-fit items-center gap-2 rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            Add product
          </button>
        </header>

        {notice && <p role="status" className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        {actionError && !itemToArchive && <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{actionError}</p>}

        <section aria-label="Inventory summary" className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Active products", value: activeItems.length, detail: `${archivedItems.length} archived` },
            { label: "Units on hand", value: stockUnits, detail: `${lowStockCount} active products at 5 units or fewer` },
            { label: "Stock value", value: formatCurrency(inventoryValue), detail: "Active items at listed prices" },
          ].map((metric) => (
            <article key={metric.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-sm font-medium text-slate-500">{metric.label}</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{metric.value}</p>
              <p className="mt-1 text-xs text-slate-400">{metric.detail}</p>
            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:px-5 sm:py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Product catalog</h2>
                <p className="mt-1 text-sm text-slate-500">Showing {visibleItems.length} products</p>
              </div>
              <div className="relative w-full sm:max-w-sm">
                <label htmlFor="inventory-search" className="sr-only">Search item or manufacturer</label>
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id="inventory-search"
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search item or manufacturer"
                  className="w-full rounded-md border border-slate-300 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>
            <div className="inline-flex w-fit rounded-md border border-slate-200 bg-slate-50 p-1" aria-label="Inventory status filter">
              {[
                { value: "active", label: `Active (${activeItems.length})` },
                { value: "archived", label: `Archived (${archivedItems.length})` },
                { value: "all", label: `All (${items.length})` },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={statusFilter === option.value}
                  onClick={() => setStatusFilter(option.value)}
                  className={`rounded px-3 py-1.5 text-sm font-medium transition ${statusFilter === option.value ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-white"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="p-10 text-center text-sm text-slate-500">Loading inventory...</p>
          ) : inventoryError ? (
            <p className="p-10 text-center text-sm text-red-700">Inventory could not be loaded. Refresh to try again.</p>
          ) : visibleItems.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-500">
              {items.length ? "No items match these filters." : "No products have been added yet."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Item</th>
                    <th className="px-5 py-3 font-medium">Manufacturer</th>
                    <th className="px-5 py-3 text-right font-medium">Stock</th>
                    <th className="px-5 py-3 text-right font-medium">Unit price</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleItems.map((item) => {
                    const quantity = Number(item.quantity) || 0;
                    const isArchived = item.isActive === false;
                    const isLow = quantity <= 5;
                    return (
                      <tr key={item._id} className={`transition ${isArchived ? "bg-slate-50" : "hover:bg-emerald-50/30"}`}>
                        <td className={`px-5 py-4 font-medium ${isArchived ? "text-slate-500" : "text-slate-900"}`}>{item.itemName}</td>
                        <td className="px-5 py-4 text-slate-600">{item.manufacturer || "-"}</td>
                        <td className="px-5 py-4 text-right font-medium text-slate-800">{quantity}</td>
                        <td className="px-5 py-4 text-right text-slate-700">{formatCurrency(item.ppp)}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${isArchived ? "bg-slate-200 text-slate-700" : quantity === 0 ? "bg-red-50 text-red-700" : isLow ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
                            {isArchived ? "Archived" : quantity === 0 ? "Out of stock" : isLow ? "Low stock" : "In stock"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/inventory/${item._id}`}
                              title={`View ${item.itemName} stock history`}
                              aria-label={`View ${item.itemName} stock history`}
                              className="rounded-md p-2 text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
                            >
                              <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                            </Link>
                            {isArchived ? (
                              <button
                                type="button"
                                onClick={() => handleRestore(item)}
                                title={`Restore ${item.itemName}`}
                                aria-label={`Restore ${item.itemName}`}
                                className="rounded-md p-2 text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
                              >
                                <ArrowUturnLeftIcon className="h-4 w-4" aria-hidden="true" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setActionError("");
                                  setItemToArchive(item);
                                }}
                                title={`Archive ${item.itemName}`}
                                aria-label={`Archive ${item.itemName}`}
                                className="rounded-md p-2 text-slate-600 hover:bg-amber-50 hover:text-amber-800"
                              >
                                <ArchiveBoxIcon className="h-4 w-4" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default ManageStore;
