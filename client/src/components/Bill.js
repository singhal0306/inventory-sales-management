import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
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
      key={item._id}
      className="flex flex-col bg-slate-400 rounded-lg p-2 justify-start mb-3 border-b-4 hover:border-spacing-1 hover:border-b-4 hover:border-gray-500 w-36"
      onClick={addToBill}
    >
      <p>
        <b>{item.itemName}</b>&nbsp;({item.quantity}) 
      </p>
      <p className="text-sm">Price: {item.ppp}</p>
      <p className="text-xs">{item.manufacturer}</p>
    </button>
  );
};

export default Bill;
