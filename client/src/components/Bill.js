import React from "react";
import { useDispatch } from "react-redux";
import { salesActions } from "../store/salesSlice";

const Bill = ({ item, quantity }) => {
  const dispatch = useDispatch();
  const addToBill = () => {
    // console.log(item);
    dispatch(salesActions.addToSales({ item, quantity }));
  };
  // const salesData = useSelector(state=> state.sales)
  // useEffect(() => {
  //   console.log(salesData)
  // }, [addToBill])

  return (
    <button
      type="button"
      className="group flex min-h-28 w-full flex-col justify-between rounded-md border border-slate-200 bg-white p-3 text-left transition hover:border-emerald-500 hover:bg-emerald-50/40 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
      onClick={addToBill}
    >
      <span className="line-clamp-2 font-medium text-slate-900">{item.itemName}</span>
      <span className="mt-1 text-xs text-slate-500">{item.manufacturer}</span>
      <span className="mt-3 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-900">₹{item.ppp}</span>
        <span className="text-xs text-emerald-800">{item.quantity} available</span>
      </span>
    </button>
  );
};

export default Bill;
