import React from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";

function SideMenu() {
  const user = useSelector((state) => state.user.user);
  return (
    <div className="h-full flex-col justify-between bg-white hidden lg:flex">
      <div className="px-4">
        <nav aria-label="Main Nav" className="mt-6 flex flex-col space-y-1">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <img
              alt="inventory-icon"
              src={require("../assets/inventory-icon.png")}
            />
            <span className="text-sm font-medium"> Inventory</span>
          </Link>

          {/* <details className="">
            <summary className="flex cursor-pointer items-center justify-between rounded-lg px-4 py-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
              <Link
                to="/manage-store"
                className="active:bg-gray-100 active:text-gray-500 "
              >
                <div className="flex items-center gap-2">
                  <img
                    alt="store-icon"
                    src={require("../assets/order-icon.png")}
                  />
                  <span className="text-sm font-medium"> Manage Store </span>
                </div>
              </Link>
            </summary>
          </details> */}
          <Link
            to="/manage-store"
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <img alt="store-icon" src={require("../assets/order-icon.png")} />
            <span className="text-sm font-medium">Manage Store</span>
          </Link>
          <Link
            to="/purchase-details"
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <img
              alt="purchase-icon"
              src={require("../assets/supplier-icon.png")}
            />
            <span className="text-sm font-medium">Sales Details</span>
          </Link>
          <Link
            to="/sales"
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <img alt="sale-icon" src={require("../assets/supplier-icon.png")} />
            <span className="text-sm font-medium"> Sales</span>
          </Link>
        </nav>
      </div>

      <div className="sticky inset-x-0 bottom-0 border-t border-gray-500">
        <div className="flex items-center gap-2 bg-white p-4 hover:bg-gray-50">
          <div>
            <p className="text-xs">
              <strong className="block font-medium">{user.name}</strong>
              <span> {user.email} </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SideMenu;
