import React from "react";
import { useSelector, useDispatch } from "react-redux";
import Bill from "../components/Bill";
import { salesActions } from "../store/salesSlice";
import { newBill } from "../store/salesAction";

const Sales = () => {
  const items = useSelector((state) => state.inventory.items);
  const salesData = useSelector((state) => state.sales.salesItems);
  const subTotal = useSelector((state) => state.sales.subtotal);
  const Total = useSelector((state) => state.sales.total);
  const CGST = useSelector((state) => state.sales.CGST);
  const IGST = useSelector((state) => state.sales.IGST);
  const customerName = useSelector((state) => state.sales.customer);
  const dispatch = useDispatch();

  const setCustomerName = (e) => {
    dispatch(salesActions.setName(e.target.value));
  };

  const checkOutHandler = () => {
    dispatch(newBill({ customerName, salesData, subTotal }));
  };

  const plusHandler = (item) => {
    dispatch(salesActions.addToSales({ item, quantity: 1 }));
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
    <div className="col-span-10 flex justify-center">
      <div className="flex flex-col container pe-4">
        <div className="flex gap-80">
          <span className="font-semibold">Sales</span>
          <span className="font-semibold">Billing Section</span>
        </div>
        <div className="flex flex-row gap-2 ">
          <div
            className="mt-5 overflow-y-auto overflow-x-hidden"
            style={{ height: "34rem" }}
          >
            <div className="columns-2 me-4">
              {items.map((item) => {
                return <Bill key={item._id} item={item} quantity={1} />;
              })}
            </div>
          </div>
          <div className="ms-4 mt-4">
            <div className="min-h-80">
              <table
                className="divide-y-2 divide-gray-200 text-sm "
                width={"700px"}
              >
                <thead>
                  <tr>
                    <th className="whitespace-nowrap px-4 py-2 text-left font-medium text-gray-900">
                      Products
                    </th>
                    <th className="whitespace-nowrap px-4 py-2 text-left font-medium text-gray-900">
                      Manufacturer
                    </th>
                    <th className="whitespace-nowrap px-4 py-2 text-left font-medium text-gray-900">
                      PPP
                    </th>

                    <th className="whitespace-nowrap ps-10 py-2 text-left font-medium text-gray-900">
                      Quantity
                    </th>

                    <th className="whitespace-nowrap px-4 py-2 text-left font-medium text-gray-900">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y-8 divide-gray-100">
                  {salesData.map((element) => {
                    return (
                      <tr key={element._id}>
                        <td className="whitespace-nowrap px-4 py-2  text-gray-900">
                          <b>{element.itemName}</b>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2  text-gray-900">
                          {element.manufacturer}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2  text-gray-900">
                          {element.ppp}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 flex  text-gray-900">
                          <i
                            className="fa fa-plus bg-green-300 mx-2 border p-2 rounded"
                            aria-hidden="true"
                            style={{ cursor: "pointer" }}
                            onClick={() => plusHandler(element)}
                          ></i>
                          <span className="pt-2">
                            <b>{element.quantity}</b>
                          </span>
                          <i
                            className="fa fa-minus bg-red-200 mx-2 border p-2 rounded"
                            aria-hidden="true"
                            style={{ cursor: "pointer" }}
                            onClick={() => minusHandler(element)}
                          ></i>
                        </td>

                        <td className="whitespace-nowrap px-4 py-2  text-gray-900">
                          {element.price}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {salesData.length > 0 && (
              <div>
                <div className="flex">
                  <div className="mt-8 ms-4 ">
                    <label htmlFor="customerName" className="text-xl">
                      Customer Name :
                    </label>
                    &nbsp;&nbsp;
                    <input
                      type="text"
                      id="customerName"
                      className="px-2 bg-slate-100 border-b-2 border-black outline-none"
                      value={customerName}
                      onChange={setCustomerName}
                    />
                  </div>
                  <h1 className="px-2 mt-8 ms-12 text-lg flex flex-col">
                    <span>Total : {Total}</span>
                    <span>CGST : {CGST}</span>
                    <span>IGST : {IGST}</span>
                    <span>Sub-Total : {subTotal} ₹</span>
                  </h1>
                </div>
                <div className="flex justify-end me-36 px-2">
                  <button
                    className="border rounded-md outline- p-2 px-4 mt-2 bg-slate-400 hover:bg-slate-300 text-lg"
                    onClick={checkOutHandler}
                  >
                    <b>Check Out</b>
                  </button>
                </div>
              </div>
            )}
            {salesData.length === 0 && (
              <div className="flex justify-center bg-slate-300 p-4 rounded-md border border-black">
                <p className="text-xl">Add item to Create Bill</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sales;
