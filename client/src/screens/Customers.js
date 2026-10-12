import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  ArrowUturnLeftIcon,
  PencilSquareIcon,
  TrashIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import {
  archiveCustomer,
  createCustomer,
  fetchCustomers,
  restoreCustomer as restoreCustomerAction,
  updateCustomer,
} from "../store/customerAction";

const emptyForm = { customerName: "", companyName: "", email: "", phone: "" };

const Customers = () => {
  const dispatch = useDispatch();
  const customers = useSelector((state) => state.customers.customers);
  const loading = useSelector((state) => state.customers.loading);
  const loadError = useSelector((state) => state.customers.error);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    dispatch(fetchCustomers());
  }, [dispatch]);

  const visibleCustomers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) =>
      `${customer.customerName} ${customer.companyName || ""} ${customer.email || ""} ${customer.phone || ""}`
        .toLowerCase()
        .includes(query)
    );
  }, [customers, searchTerm]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setNotice("");
  };

  const submitCustomer = async (event) => {
    event.preventDefault();
    if (!form.customerName.trim()) {
      setError("Customer name is required.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (editingId) {
        await dispatch(updateCustomer(editingId, form));
        setNotice("Customer details updated.");
      } else {
        await dispatch(createCustomer(form));
        setNotice("Customer added.");
      }
      setForm(emptyForm);
      setEditingId(null);
    } catch (saveError) {
      setError(saveError.message || "Customer could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const editCustomer = (customer) => {
    setEditingId(customer._id);
    setForm({
      customerName: customer.customerName || "",
      companyName: customer.companyName || "",
      email: customer.email || "",
      phone: customer.phone || "",
    });
    setError("");
    setNotice("");
  };

  const removeCustomer = async (customer) => {
    if (!window.confirm(`Remove ${customer.customerName} from active customers?`)) return;
    setError("");
    setNotice("");
    try {
      const message = await dispatch(archiveCustomer(customer));
      if (editingId === customer._id) resetForm();
      setNotice(message);
    } catch (deleteError) {
      setError(deleteError.message || "Customer could not be deleted.");
    }
  };

  const restoreCustomer = async (customer) => {
    setError("");
    setNotice("");
    try {
      const message = await dispatch(restoreCustomerAction(customer._id));
      setNotice(message);
    } catch (restoreError) {
      setError(restoreError.message || "Customer could not be restored.");
    }
  };

  return (
    <main className="col-span-12 min-w-0 px-4 py-6 sm:px-6 lg:col-span-10 lg:px-8">
      <div className="mx-auto w-full max-w-screen-xl">
        <header className="mb-6 border-b border-slate-200 pb-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">Customer directory</p>
          <h1 className="text-2xl font-semibold text-slate-900">Manage customers</h1>
          <p className="mt-1 text-sm text-slate-500">Keep customer records and optional contact details organized.</p>
        </header>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.65fr)]">
          <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <h2 className="font-semibold text-slate-900">Customers</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {customers.filter((customer) => customer.isActive !== false).length} active · {customers.length} total
                </p>
              </div>
              <label className="sr-only" htmlFor="customer-search">Search customers</label>
              <input
                id="customer-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search name, company, email, or phone"
                className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100 sm:max-w-xs"
              />
            </div>
            {loading && customers.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">Loading customers...</p>
            ) : loadError && customers.length === 0 ? (
              <p role="alert" className="p-8 text-center text-sm text-red-700">{loadError}</p>
            ) : visibleCustomers.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">No customers found.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                {visibleCustomers.map((customer) => (
                  <article
                    key={customer._id}
                    className={`overflow-hidden rounded-md border transition ${customer.isActive === false ? "border-slate-200 bg-slate-50" : "border-slate-200 bg-white hover:border-emerald-400 hover:shadow-sm"}`}
                  >
                    <Link
                      to={`/customers/${customer._id}`}
                      aria-label={`View bills for ${customer.customerName}`}
                      className="block p-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold text-slate-900">{customer.customerName}</h3>
                          <p className="mt-1 truncate text-sm text-slate-600">{customer.companyName || "No company"}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${customer.isActive === false ? "bg-slate-200 text-slate-700" : "bg-emerald-50 text-emerald-800"}`}>
                          {customer.isActive === false ? "Archived" : "Active"}
                        </span>
                      </div>
                      <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm text-slate-500">
                        <p className="truncate">{customer.email || "No email provided"}</p>
                        <p>{customer.phone || "No phone provided"}</p>
                      </div>
                      <p className="mt-4 text-xs font-medium text-emerald-700">
                        View customer bills <span aria-hidden="true">&rarr;</span>
                      </p>
                    </Link>
                    <div className="flex justify-end gap-2 border-t border-slate-100 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => editCustomer(customer)}
                        title={`Edit ${customer.customerName}`}
                        aria-label={`Edit ${customer.customerName}`}
                        className="rounded p-2 text-slate-600 hover:bg-slate-100 hover:text-emerald-800"
                      >
                        <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                      </button>
                      {customer.isActive === false ? (
                        <button
                          type="button"
                          onClick={() => restoreCustomer(customer)}
                          title={`Restore ${customer.customerName}`}
                          aria-label={`Restore ${customer.customerName}`}
                          className="rounded p-2 text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
                        >
                          <ArrowUturnLeftIcon className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeCustomer(customer)}
                          title={`Remove ${customer.customerName} from active customers`}
                          aria-label={`Remove ${customer.customerName} from active customers`}
                          className="rounded p-2 text-slate-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <TrashIcon className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className="h-fit rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-800">
                <UserPlusIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-semibold text-slate-900">{editingId ? "Edit customer" : "Add customer"}</h2>
                <p className="text-sm text-slate-500">Email and phone are optional.</p>
              </div>
            </div>
            <form onSubmit={submitCustomer} className="space-y-4">
              <div>
                <label htmlFor="customer-form-name" className="mb-1.5 block text-sm font-medium text-slate-700">Customer name</label>
                <input
                  id="customer-form-name"
                  type="text"
                  required
                  value={form.customerName}
                  onChange={(event) => setForm({ ...form, customerName: event.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label htmlFor="customer-form-company" className="mb-1.5 block text-sm font-medium text-slate-700">Company name (optional)</label>
                <input
                  id="customer-form-company"
                  type="text"
                  value={form.companyName}
                  onChange={(event) => setForm({ ...form, companyName: event.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label htmlFor="customer-form-email" className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                <input
                  id="customer-form-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label htmlFor="customer-form-phone" className="mb-1.5 block text-sm font-medium text-slate-700">Phone number</label>
                <input
                  id="customer-form-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  {saving ? "Saving..." : editingId ? "Save changes" : "Add customer"}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm} className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default Customers;
