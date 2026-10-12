import React from "react";
import { useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const BillDetails = () => {
  const { billId } = useParams();
  const bills = useSelector((state) => state.bills.bills);
  const loading = useSelector((state) => state.bills.loading);
  const error = useSelector((state) => state.bills.error);

  const bill = bills.find((entry) => entry._id === billId);

  return (
    <main className="col-span-12 min-w-0 px-4 py-6 sm:px-6 lg:col-span-10 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          to="/purchase-details"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-900"
        >
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
          Back to sales history
        </Link>

        {loading ? (
          <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Loading bill...
          </p>
        ) : error ? (
          <p className="rounded-lg border border-red-200 bg-white p-8 text-center text-sm text-red-700">
            This bill could not be loaded.
          </p>
        ) : !bill ? (
          <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Bill not found.
          </p>
        ) : (
          <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <header className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  Sales receipt
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-slate-900">
                  Bill #{String(bill._id).slice(-6).toUpperCase()}
                </h1>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm text-slate-500">Date issued</p>
                <p className="mt-1 font-medium text-slate-800">
                  {new Date(bill.createdAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                <p className="mt-2 text-xs text-slate-500">Created by</p>
                <p className="font-medium text-slate-700">{bill.createdBy?.name || "Not recorded"}</p>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-4 border-b border-slate-200 p-5 sm:grid-cols-2 sm:p-7">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Customer</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {bill.customer?.customerName || bill.customerName || "Customer unavailable"}
                </p>
                {bill.customer?.companyName && (
                  <p className="mt-1 text-sm text-slate-600">{bill.customer.companyName}</p>
                )}
                {(bill.customer?.phone || bill.customer?.email) && (
                  <p className="mt-1 text-sm text-slate-500">
                    {[bill.customer.phone, bill.customer.email].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <div className="sm:text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Items purchased</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {bill.salesData.reduce((total, item) => total + Number(item.quantity || 0), 0)} units
                </p>
              </div>
            </div>

            <div className="overflow-x-auto p-5 sm:p-7">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="pb-3 font-medium">Item</th>
                    <th className="pb-3 font-medium">Manufacturer</th>
                    <th className="pb-3 text-right font-medium">Unit price</th>
                    <th className="pb-3 text-right font-medium">Quantity</th>
                    <th className="pb-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bill.salesData.map((item, index) => (
                    <tr key={`${item._id}-${index}`}>
                      <td className="py-4 font-medium text-slate-900">
                        {item.item?.itemName || item.itemName || "Item unavailable"}
                      </td>
                      <td className="py-4 text-slate-500">
                        {item.item?.manufacturer || item.manufacturer || "-"}
                      </td>
                      <td className="py-4 text-right text-slate-700">{formatCurrency(item.ppp)}</td>
                      <td className="py-4 text-right text-slate-700">{item.quantity}</td>
                      <td className="py-4 text-right font-medium text-slate-900">
                        {formatCurrency(item.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className="flex justify-end border-t border-slate-200 bg-slate-50 p-5 sm:p-7">
              <div className="w-full sm:max-w-xs">
                <div className="flex items-center justify-between gap-6">
                  <span className="text-sm text-slate-600">Bill total</span>
                  <span className="text-xl font-semibold text-emerald-800">
                    {formatCurrency(bill.subTotal)}
                  </span>
                </div>
              </div>
            </footer>
          </article>
        )}
      </div>
    </main>
  );
};

export default BillDetails;