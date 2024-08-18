import React from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

const ProtectedWrapper = (props) => {
  const auth = useSelector((state) => state.user.loginSuccess);

  if (!auth) {
    return <Navigate to="/login" replace />;
  }
  return props.children;
};

export default ProtectedWrapper;
