import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import SideMenu from "./SideMenu";
import { getBills } from "../store/billAction";
import { getItems } from "../store/inventoryAction";
import { useDispatch, useSelector } from "react-redux";

let isInitial = true;

const Layout = () => {
  const dispatch = useDispatch();
  const sales = useSelector((state) => state.sales);

  useEffect(() => {
    if (isInitial) {
      isInitial = false;
      return;
    } else {
      if (sales.changed) {
        console.log("changed");
        dispatch(getBills());
        dispatch(getItems());
      }
    }
  }, [dispatch, sales]);

  return (
    <div className="grid grid-cols-12 bg-gray-100 items-baseline">
      <div className="col-span-2 h-screen sticky top-0 hidden lg:flex">
        <SideMenu />
      </div>
      <Outlet />
    </div>
  );
};

export default Layout;
