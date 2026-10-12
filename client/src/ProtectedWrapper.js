import React from "react";
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import Spineer from "./components/Spineer";

const ProtectedWrapper = (props) => {
  const { authChecked, loginSuccess } = useSelector((state) => state.user);
  const location = useLocation();

  if (!authChecked) {
    return (
      <div className="col-span-12 flex min-h-screen items-center justify-center bg-gray-100">
        <Spineer />
      </div>
    );
  }

  if (!loginSuccess) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return props.children;
};

export default ProtectedWrapper;
