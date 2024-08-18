import React from "react";

const SuccessAlert = (props) => {
  return (
    <div
      className="bg-teal-100 border-t-4 border-teal-500 rounded-b text-teal-900 px-4 py-3 shadow-md"
      role="alert"
    >
      <div className="flex">
        <div className="py-1"></div>
        <div>
          <p className="font-bold">{props.alert}</p>
        </div>
      </div>
      <p className="text-sm">{props.message}</p>
    </div>
  );
};

export default SuccessAlert;
