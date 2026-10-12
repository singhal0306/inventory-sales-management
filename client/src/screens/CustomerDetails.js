import React, { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useDispatch, useSelector } from "react-redux";
import { fetchCustomers } from "../store/customerAction";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const normalizeName = (name) =>
  String(name || "").trim().replace(/\s+/g, " ").toLowerCase();

const CustomerDetails = () => {
  const { customerId } = useParams();
  const dispatch = useDispatch();
  const customers = useSelector((state) => state.customers.customers);
  const customerLoading = useSelector((state) => state.customers.loading);
  const customerLoadError = useSelector((state) => state.customers.error);
  const customersLoaded = useSelector((state) => state.customers.loaded);
  const bills = useSelector((state) => state.bills.bills);
  const billsLoading = useSelector((state) => state.bills.loading);
  const billsError = useSelector((state) => state.bills.error);
  const customer = customers.find((entry) => entry._id === customerId);
  const customerError = customerLoadError || (customersLoaded && !customer ? "Customer not found." : "");

  useEffect(() => {
    dispatch(fetchCustomers());
  }, [dispatch]);

  const customerBills = useMemo(() => {
    if (!customer) return [];
    return bills
      .filter((bill) => {
        const billCustomerId = bill.customer?._id || bill.customer;
        if (billCustomerId) return String(billCustomerId) === customerId;
        return normalizeName(bill.customerName) === normalizeName(customer.customerName);
      })
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  }, [bills, customer, customerId]);

  const purchasedItems = useMemo(() => {
    const itemTotals = new Map();
    customerBills.forEach((bill) => {
      (bill.salesData || []).forEach((line) => {
        const item = line.item;
        const itemId = item?._id || item || line.itemId || line._id;
        const itemName = item?.itemName || line.itemName || "Item unavailable";
        const manufacturer = item?.manufacturer || line.manufacturer || "";
        const key = String(itemId || `${itemName}-${manufacturer}`);
        const entry = itemTotals.get(key) || {
          key,
          itemName,
          manufacturer,
          quantity: 0,
          spend: 0,
          billIds: new Set(),
        };
        const quantity = Number(line.quantity) || 0;
        entry.quantity += quantity;
        entry.spend += Number(line.price) || (Number(line.ppp) || 0) * quantity;
        entry.billIds.add(String(bill._id));
        itemTotals.set(key, entry);
      });
    });

    return Array.from(itemTotals.values()).sort(
      (left, right) => right.quantity - left.quantity || left.itemName.localeCompare(right.itemName)
    );
  }, [customerBills]);

  const totalUnits = customerBills.reduce(
    (total, bill) => total + (bill.salesData || []).reduce(
      (billUnits, line) => billUnits + Number(line.quantity || 0),
      0
    ),
    0
  );
  const lifetimeSpend = customerBills.reduce((total, bill) => total + Number(bill.subTotal || 0), 0);

  return (
    <main className="col-span-12 min-w-0 px-4 py-6 sm:px-6 lg:col-span-10 lg:px-8">
      <div className="mx-auto w-full max-w-screen-xl">
        <Link to="/customers" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-900">
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
          Back to customers
        </Link>

        {customerLoading ? (
          <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Loading customer...
          </p>
        ) : customerError ? (
          <p role="alert" className="rounded-lg border border-red-200 bg-white p-8 text-center text-sm text-red-700">
            {customerError}
          </p>
        ) : (
          <>
            <header className="mb-6 border-b border-slate-200 pb-5">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">Customer account</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900">{customer.customerName}</h1>
                  {customer.companyName && <p className="mt-1 text-slate-600">{customer.companyName}</p>}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                    {customer.email && <span>{customer.email}</span>}
                    {customer.phone && <span>{customer.phone}</span>}
                  </div>
                </div>
                <span className={`w-fit rounded-full px-3 py-1 text-sm font-medium ${customer.isActive === false ? "bg-slate-200 text-slate-700" : "bg-emerald-50 text-emerald-800"}`}>
                  {customer.isActive === false ? "Archived" : "Active"}
                </span>
              </div>
            </header>

            <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                {
                  label: "Customer created",
                  actor: customer.createdBy?.name,
                  date: customer.createdAt,
                },
                {
                  label: "Customer last updated",
                  actor: customer.updatedBy?.name,
                  date: customer.updatedAt,
                },
                ...(customer.archivedAt
                  ? [{
                      label: "Customer archived",
                      actor: customer.archivedBy?.name,
                      date: customer.archivedAt,
                    }]
                  : []),
              ].map((entry) => (
                <article key={entry.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{entry.label}</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{entry.actor || "Not recorded"}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {entry.date
                      ? new Date(entry.date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
                      : "Date not recorded"}
                  </p>
                </article>
              ))}
            </section>

            <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: "Bills", value: customerBills.length },
                { label: "Units purchased", value: totalUnits },
                { label: "Lifetime spend", value: formatCurrency(lifetimeSpend) },
              ].map((metric) => (
                <article key={metric.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-500">{metric.label}</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{metric.value}</p>
                </article>
              ))}
            </section>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-4 sm:px-5">
                <h2 className="font-semibold text-slate-900">Bill history</h2>
                <p className="mt-1 text-sm text-slate-500">Every bill associated with this customer.</p>
              </div>
              {billsLoading ? (
                <p className="p-8 text-center text-sm text-slate-500">Loading bills...</p>
              ) : billsError ? (
                <p className="p-8 text-center text-sm text-red-700">Bills could not be loaded.</p>
              ) : customerBills.length === 0 ? (
                <p className="p-8 text-center text-sm text-slate-500">No bills have been recorded for this customer.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-medium">Bill</th>
                        <th className="px-5 py-3 font-medium">Items</th>
                        <th className="px-5 py-3 text-right font-medium">Units</th>
                        <th className="px-5 py-3 font-medium">Date</th>
                        <th className="px-5 py-3 text-right font-medium">Total</th>
                        <th className="px-5 py-3 text-right font-medium">&nbsp;</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customerBills.map((bill) => {
                        const lines = bill.salesData || [];
                        const units = lines.reduce((total, line) => total + Number(line.quantity || 0), 0);
                        const itemSummary = lines.map((line) => {
                          const item = line.item;
                          return `${item?.itemName || line.itemName || "Item"} × ${line.quantity}`;
                        }).join(", ");
                        return (
                          <tr key={bill._id} className="hover:bg-emerald-50/30">
                            <td className="px-5 py-4 font-medium text-slate-800">#{String(bill._id).slice(-6).toUpperCase()}</td>
                            <td className="max-w-sm truncate px-5 py-4 text-slate-600" title={itemSummary}>{itemSummary || "-"}</td>
                            <td className="px-5 py-4 text-right text-slate-700">{units}</td>
                            <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                              {new Date(bill.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                            </td>
                            <td className="px-5 py-4 text-right font-semibold text-slate-900">{formatCurrency(bill.subTotal)}</td>
                            <td className="px-5 py-4 text-right">
                              <Link to={`/purchase-details/${bill._id}`} className="whitespace-nowrap font-medium text-emerald-700 hover:text-emerald-900">
                                Open bill <span aria-hidden="true">&rarr;</span>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-4 sm:px-5">
                <h2 className="font-semibold text-slate-900">Items purchased</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Total quantities combined across all of this customer’s bills.
                </p>
              </div>
              {billsLoading ? (
                <p className="p-8 text-center text-sm text-slate-500">Calculating purchased items...</p>
              ) : billsError ? (
                <p className="p-8 text-center text-sm text-red-700">Purchased item totals could not be loaded.</p>
              ) : purchasedItems.length === 0 ? (
                <p className="p-8 text-center text-sm text-slate-500">No purchased items to summarize.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-medium">Item</th>
                        <th className="px-5 py-3 font-medium">Manufacturer</th>
                        <th className="px-5 py-3 text-right font-medium">Total quantity</th>
                        <th className="px-5 py-3 text-right font-medium">Bills</th>
                        <th className="px-5 py-3 text-right font-medium">Item spend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {purchasedItems.map((item) => (
                        <tr key={item.key} className="hover:bg-emerald-50/30">
                          <td className="px-5 py-4 font-medium text-slate-900">{item.itemName}</td>
                          <td className="px-5 py-4 text-slate-600">{item.manufacturer || "-"}</td>
                          <td className="px-5 py-4 text-right font-semibold text-slate-900">{item.quantity}</td>
                          <td className="px-5 py-4 text-right text-slate-700">{item.billIds.size}</td>
                          <td className="px-5 py-4 text-right font-medium text-slate-900">{formatCurrency(item.spend)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
};

export default CustomerDetails;
