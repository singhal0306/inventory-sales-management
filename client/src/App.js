import React, { useEffect } from "react";
import Login from "./screens/Login";
import Register from "./screens/Register";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./screens/Home";
import ProtectedWrapper from "./ProtectedWrapper";
import Layout from "./components/Layout";
import NoPageFound from "./screens/NoPageFound";
import ManageStore from "./screens/ManageStore";
import Sales from "./screens/Sales";
import SalesDetails from "./screens/SalesDetails";
import BillDetails from "./screens/BillDetails";
import SalesAnalytics from "./screens/SalesAnalytics";
import InventoryDetails from "./screens/InventoryDetails";
import Customers from "./screens/Customers";
import CustomerDetails from "./screens/CustomerDetails";
import Profile from "./screens/Profile";
import { getUser } from "./store/userAction";
import { useDispatch } from "react-redux";

function App() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(getUser());
  },[dispatch]);
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedWrapper>
              <Layout />
            </ProtectedWrapper>
          }
        >
          <Route index element={<Home />} />
          <Route path="/inventory/:itemId" element={<InventoryDetails />} />
          <Route path="/manage-store" element={<ManageStore />} />
          <Route path="/purchase-details" element={<SalesDetails />} />
          <Route path="/purchase-details/:billId" element={<BillDetails />} />
          <Route path="/sales-analytics" element={<SalesAnalytics />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:customerId" element={<CustomerDetails />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/sales" element={<Sales />} />
        </Route>
        <Route path="*" element={<NoPageFound />} />
      </Routes>
    </Router>
  );
}

export default App;
