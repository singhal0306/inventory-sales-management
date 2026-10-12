import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import Bill from "../components/Bill";
import { salesActions } from "../store/salesSlice";
import { newBill } from "../store/salesAction";
import { customerActions } from "../store/customerSlice";
import { fetchCustomers } from "../store/customerAction";

const Sales = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerCompany, setCustomerCompany] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerSuggestionsOpen, setCustomerSuggestionsOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const customers = useSelector((state) => state.customers.customers);
  const inventoryItems = useSelector((state) => state.inventory.items);
  const items = inventoryItems.filter((item) => item.isActive !== false);
  const inventoryLoading = useSelector((state) => state.inventory.loading);
  const salesData = useSelector((state) => state.sales.salesItems);
  const subTotal = useSelector((state) => state.sales.subtotal);
  const Total = useSelector((state) => state.sales.total);
  const CGST = useSelector((state) => state.sales.CGST);
  const IGST = useSelector((state) => state.sales.IGST);
  const customerName = useSelector((state) => state.sales.customer);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchCustomers());
  }, [dispatch]);

  const setCustomerName = (e) => {
    dispatch(salesActions.setName(e.target.value));
    setCustomerId("");
    setCustomerCompany("");
    setCustomerEmail("");
    setCustomerPhone("");
    setCustomerSuggestionsOpen(true);
  };

  const chooseCustomer = (customer) => {
    dispatch(salesActions.setName(customer.customerName));
    setCustomerId(customer._id);
    setCustomerCompany(customer.companyName || "");
    setCustomerEmail(customer.email || "");
    setCustomerPhone(customer.phone || "");
    setCustomerSuggestionsOpen(false);
  };

  const customerMatches = customers
    .filter((customer) =>
      customer.isActive !== false &&
      customer.customerName.toLowerCase().includes(customerName.trim().toLowerCase())
    )
    .slice(0, 6);

  const checkOutHandler = async () => {
    if (!customerName.trim()) {
      setCheckoutError("Enter or select a customer before checking out.");
      return;
    }
    setCheckoutError("");
    try {
      const bill = await dispatch(newBill({
        customerId: customerId || undefined,
        customerName: customerName.trim(),
        companyName: customerCompany,
        email: customerEmail,
        phone: customerPhone,
        salesData,
        subTotal,
      }));
      if (bill?.customer) dispatch(customerActions.upsertCustomer(bill.customer));
      setCustomerId("");
      setCustomerCompany("");
      setCustomerEmail("");
      setCustomerPhone("");
      setCustomerSuggestionsOpen(false);
    } catch (error) {
      setCheckoutError(error.message);
    }
  };

  const searchHandler = (event) => {
    event.preventDefault();
    setSearchQuery(searchTerm.trim().toLowerCase());
  };

  const visibleItems = items.filter((item) => {
    const searchableText = `${item.itemName || ""} ${item.manufacturer || ""}`.toLowerCase();
    return Number(item.quantity) > 0 && searchableText.includes(searchQuery);
  });
  const inStockCount = items.filter((item) => Number(item.quantity) > 0).length;

  const plusHandler = (item) => {
    const inventoryItem = items.find((availableItem) => availableItem._id === item._id);
    if (inventoryItem) {
      dispatch(salesActions.addToSales({ item: inventoryItem, quantity: 1 }));
    }
  };

  const minusHandler = (item) => {
    if (item.quantity !== 1) {
      dispatch(salesActions.addToSales({ item, quantity: -1 }));
    } else {
      dispatch(
        salesActions.removeFromSales({ _id: item._id, price: item.price })
      );
    }
  };
  return (
    <main className="col-span-12 min-w-0 px-4 py-6 sm:px-6 lg:col-span-10 lg:px-8">
      <div className="mx-auto w-full max-w-screen-2xl">
        <header className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Point of sale
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">Create a sale</h1>
            <p className="mt-1 text-sm text-slate-500">
              Select available stock, adjust quantities, and review the bill.
            </p>
          </div>
          <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
            {inStockCount} items in stock
          </span>
        </header>
        <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">Available items</h2>
                <p className="mt-1 text-sm text-slate-500">Search by product or manufacturer</p>
              </div>
              <span className="shrink-0 text-sm text-slate-500">{visibleItems.length} results</span>
            </div>
            <form onSubmit={searchHandler} role="search" className="mb-4 flex gap-2">
              <label htmlFor="sales-item-search" className="sr-only">
                Search items by name or manufacturer
              </label>
              <input
                id="sales-item-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search items or manufacturers"
                className="min-w-0 flex-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
              <button
                type="submit"
                aria-label="Search items"
                title="Search items"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-emerald-700 text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                <MagnifyingGlassIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </form>
            <div className="max-h-[34rem] min-h-56 overflow-y-auto overscroll-contain pr-1">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {inventoryLoading ? (
                  <p className="col-span-full rounded-md bg-slate-50 p-6 text-center text-sm text-slate-500">
                    Loading inventory...
                  </p>
                ) : visibleItems.map((item) => (
                  <Bill key={item._id} item={item} quantity={1} />
                ))}
                {!inventoryLoading && visibleItems.length === 0 && (
                  <p className="col-span-full rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    No in-stock items match your search.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">Current bill</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {salesData.length} {salesData.length === 1 ? "product" : "products"} selected
                </p>
              </div>
            </div>
            {salesData.length > 0 ? (
              <>
                <div className="overflow-x-auto rounded-md border border-slate-200">
                  <table className="w-full min-w-[540px] divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-3 text-left font-medium text-slate-600">Product</th>
                        <th className="px-3 py-3 text-left font-medium text-slate-600">Maker</th>
                        <th className="px-3 py-3 text-right font-medium text-slate-600">Price</th>
                        <th className="px-3 py-3 text-center font-medium text-slate-600">Qty</th>
                        <th className="px-3 py-3 text-right font-medium text-slate-600">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {salesData.map((element) => {
                        const availableQuantity = Number(
                          items.find((item) => item._id === element._id)?.quantity || 0
                        );
                        return (
                          <tr key={element._id}>
                            <td className="px-3 py-3 font-medium text-slate-900">{element.itemName}</td>
                            <td className="px-3 py-3 text-slate-500">{element.manufacturer}</td>
                            <td className="px-3 py-3 text-right text-slate-700">₹{element.ppp}</td>
                            <td className="px-3 py-3">
                              <div className="flex items-center justify-center">
                                <button
                                  type="button"
                                  className="h-8 w-8 rounded border border-red-200 bg-red-50 font-semibold text-red-700 transition hover:bg-red-100"
                                  aria-label={`Remove one ${element.itemName}`}
                                  onClick={() => minusHandler(element)}
                                >
                                  -
                                </button>
                                <span className="min-w-9 text-center font-medium text-slate-800">
                                  {element.quantity}
                                </span>
                                <button
                                  type="button"
                                  className="h-8 w-8 rounded border border-emerald-200 bg-emerald-50 font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                                  aria-label={`Add one ${element.itemName}`}
                                  disabled={element.quantity >= availableQuantity}
                                  onClick={() => plusHandler(element)}
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right font-medium text-slate-900">₹{element.price}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-md bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Items total</p>
                    <p className="mt-1 font-semibold text-slate-900">₹{Total}</p>
                  </div>
                  <div className="rounded-md bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">CGST</p>
                    <p className="mt-1 font-semibold text-slate-900">₹{CGST}</p>
                  </div>
                  <div className="rounded-md bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">IGST</p>
                    <p className="mt-1 font-semibold text-slate-900">₹{IGST}</p>
                  </div>
                  <div className="rounded-md bg-emerald-50 p-3">
                    <p className="text-xs text-emerald-800">Bill total</p>
                    <p className="mt-1 font-semibold text-emerald-900">₹{subTotal}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-end">
                  <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="relative sm:col-span-3">
                      <label htmlFor="customerName" className="mb-1.5 block text-sm font-medium text-slate-700">
                        Customer name
                      </label>
                      <input
                        type="text"
                        id="customerName"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={customerSuggestionsOpen && customerName.trim().length > 0}
                        aria-controls="customer-suggestions"
                        autoComplete="off"
                        className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                        placeholder="Search or enter customer name"
                        value={customerName}
                        onFocus={() => setCustomerSuggestionsOpen(true)}
                        onBlur={() => setTimeout(() => setCustomerSuggestionsOpen(false), 120)}
                        onChange={setCustomerName}
                      />
                      {customerSuggestionsOpen && customerName.trim() && customerMatches.length > 0 && (
                        <ul
                          id="customer-suggestions"
                          role="listbox"
                          className="absolute inset-x-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
                        >
                          {customerMatches.map((customer) => (
                            <li key={customer._id} role="option" aria-selected={customerId === customer._id}>
                              <button
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => chooseCustomer(customer)}
                                className="flex w-full flex-col px-3 py-2 text-left hover:bg-emerald-50"
                              >
                                <span className="text-sm font-medium text-slate-800">{customer.customerName}</span>
                                <span className="text-xs text-slate-500">
                                  {[customer.companyName, customer.phone, customer.email].filter(Boolean).join(" · ")}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="sm:col-span-3">
                      <label htmlFor="customerCompany" className="mb-1.5 block text-xs font-medium text-slate-600">Company (optional)</label>
                      <input
                        type="text"
                        id="customerCompany"
                        value={customerCompany}
                        disabled={Boolean(customerId && customerCompany)}
                        onChange={(event) => setCustomerCompany(event.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50"
                      />
                    </div>
                    <div>
                      <label htmlFor="customerPhone" className="mb-1.5 block text-xs font-medium text-slate-600">Phone (optional)</label>
                      <input
                        type="tel"
                        id="customerPhone"
                        value={customerPhone}
                        disabled={Boolean(customerId && customerPhone)}
                        onChange={(event) => setCustomerPhone(event.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="customerEmail" className="mb-1.5 block text-xs font-medium text-slate-600">Email (optional)</label>
                      <input
                        type="email"
                        id="customerEmail"
                        value={customerEmail}
                        disabled={Boolean(customerId && customerEmail)}
                        onChange={(event) => setCustomerEmail(event.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-md bg-emerald-700 px-5 py-2.5 font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    onClick={checkOutHandler}
                  >
                    Check out
                  </button>
                </div>
                {checkoutError && (
                  <p role="alert" className="mt-3 text-right text-sm text-red-700">{checkoutError}</p>
                )}
              </>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-5 text-center">
                <p className="font-medium text-slate-800">Your bill is empty</p>
                <p className="mt-1 text-sm text-slate-500">Choose an item from the inventory to get started.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};

export default Sales;
