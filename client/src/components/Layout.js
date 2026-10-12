import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import SideMenu from "./SideMenu";
import { getBills } from "../store/billAction";
import { getItems } from "../store/inventoryAction";
import { useDispatch } from "react-redux";

const Layout = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getItems());
    dispatch(getBills());
  }, [dispatch]);

  return (
    <div className="grid grid-cols-12 bg-gray-100 items-baseline">
      <div className="col-span-12 min-w-0 lg:col-span-2 lg:sticky lg:top-0 lg:h-screen">
        <SideMenu />
      </div>
      <Outlet />
    </div>
  );
};

export default Layout;
