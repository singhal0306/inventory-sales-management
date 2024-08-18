import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { deleteItem } from "../store/inventoryAction";
import AddProduct from "../components/AddProduct";
const ManageStore = () => {
  const [searchTerm, setSearchTerm] = useState();
  const [showProductModal, setShowProductModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const dispatch = useDispatch();
  const items = useSelector((state) => state.inventory.items);
  
  const addProductModalSetting = () => {
    setShowProductModal(!showProductModal);
  };

  const handleSearchTerm = (e) => {
    setSearchTerm(e.target.value);
    // fetchSearchData();
  };
  const deleteHandler = (id, itemName) => {
    dispatch(deleteItem(id, itemName));
  };

  return (
    <div className="col-span-10 flex justify-center ">
      <div className="flex flex-col w-11/12">
        {showProductModal && (
          <AddProduct addProductModalSetting={addProductModalSetting} />
        )}

        <span className="font-semibold px-4">Manage Store</span>
        <div className="px-4 mt-5 overflow-x-auto rounded-lg border bg-white border-gray-200 pb-3">
          <div className="flex justify-between pt-5 pb-3 px-3">
            <div className="flex gap-4 justify-center items-center">
              <span className="font-bold">Products</span>
              <div className="flex justify-center items-center py-2 px-2 border-2 rounded-md ">
                <img
                  alt="search-icon"
                  className="w-5 h-5"
                  src={require("../assets/search-icon.png")}
                />
                <input
                  className="border-none outline-none focus:border-none text-xs ps-2"
                  type="text"
                  placeholder="Search here"
                  value={searchTerm}
                  onChange={handleSearchTerm}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold p-2 text-xs  rounded"
                onClick={addProductModalSetting}
              >
                Add New Product
              </button>
            </div>
          </div>
          <table className="min-w-full divide-y-2 divide-gray-200 text-sm">
            <thead>
              <tr>
                <th className="whitespace-nowrap px-4 py-2 text-left font-medium text-gray-900">
                  Products
                </th>
                <th className="whitespace-nowrap px-4 py-2 text-left font-medium text-gray-900">
                  Manufacturer
                </th>

                <th className="whitespace-nowrap px-4 py-2 text-left font-medium text-gray-900">
                  Stock
                </th>
                <th className="whitespace-nowrap px-4 py-2 text-left font-medium text-gray-900">
                  PPP
                </th>

                <th className="whitespace-nowrap px-4 py-2 text-left font-medium text-gray-900">
                  Availibility
                </th>
                <th className="whitespace-nowrap px-4 py-2 text-left font-medium text-gray-900">
                  More
                </th>
              </tr>
            </thead>

            <tbody className="divide-y-8 divide-gray-100">
              {items.map((element) => {
                return (
                  <tr key={element._id}>
                    <td className="whitespace-nowrap px-4 py-2  text-gray-900">
                      <b>{element.itemName}</b>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2  text-gray-900">
                      {element.manufacturer}
                    </td>

                    <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                      {element.quantity}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                      {element.ppp}
                    </td>

                    <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                      {element.quantity > 0 ? "In Stock" : "Not in Stock"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                      <span
                        className="text-green-700 cursor-pointer"
                        // onClick={() => updateProductModalSetting(element)}
                      >
                        Edit{" "}
                      </span>
                      <span
                        className="text-red-600 px-2 cursor-pointer"
                        onClick={() => deleteHandler(element._id, element.itemName)}
                      >
                        Delete
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageStore;
