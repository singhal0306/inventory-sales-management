import React from "react";

const ErrorAlert = (props) => {
  return (
    <div
      className="bg-red-100 border-t-4 border-red-500 rounded-b text-red-900 px-4 py-3 shadow-md"
      role="alert"
    >
      <div className="flex">
        <p className="py-1"></p>
        <div>
          <p className="font-bold">{props.alert}</p>
        </div>
      </div>
    </div>
  );
};

export default ErrorAlert;
