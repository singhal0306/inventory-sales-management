import React from "react";
import { useSelector } from "react-redux";

const Home = () => {
  const Items = useSelector((state) => state.inventory.items) || [];
  return (
    <div className="col-span-10 flex justify-center">
      <div className="flex flex-col gap-5 w-11/12 p-3">
        <span className="font-semibold px-4">Overall Inventory</span>
        <div className="mt-5 grid grid-cols-4 gap-6 justify-center items-center">
          {Items.map((item) => {
            return (
              <div
                key={item._id}
                className=" bg-white flex flex-col p-8 w-full  "
              >
                <span className="font-semibold text-blue-600 text-base">
                  {item.itemName}
                </span>
                <span className="font-thin text-gray-400 text-xs">
                  {item.manufacturer}
                </span>
                <span className="font-semibold text-gray-600 text-sm">
                  Quantity: {item.quantity}
                </span>
                <span className="font-semibold text-gray-600 text-sm">
                  PPP: {item.ppp}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Home;
