import React, {useState} from "react";
import { useSelector } from "react-redux";

const SalesDetails = () => {
  const bills = useSelector((state) => state.bills.bills);
  const [modal, setModal ] = useState(false)
  // console.log(bills[0])
  return (
    <div className="flex flex-col">
      Sales Details
      {bills.map((bill) => {
        return (
          <button
            key={bill._id}
            className="ms-48 p-4 flex m-2 justify-around w-96 bg-slate-200 rounded-md shadow-md"
            style={{ width: "40rem" }}
            onClick={() => setModal(true)}
          >
            <p>
              <b>{bill.customerName}</b>
            </p>
            <p>{bill.subTotal}</p>
            <p>{new Date(bill.createdAt).toDateString()}</p>
            <p>
              {new Date(bill.createdAt).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "numeric",
                hour12: true,
              })}
            </p>
          </button>
        );
      })}
    </div>
  );
};

export default SalesDetails;
// const data = {
//   "_id": "661f3ac9d3079d367377309c",
//   "customerName": "aniki",
//   "salesData": [
//       {
//           "_id": "65e03af1d6601af10c52dfc1",
//           "itemName": "Coca",
//           "manufacturer": "Rajwada",
//           "quantity": 1,
//           "ppp": 20,
//           "price": 20
//       }
//   ],
//   "subTotal": 80,
//   "createdAt": "2024-04-17T02:58:17.077Z",
//   "updatedAt": "2024-04-17T02:58:17.077Z",
//   "__v": 0
// }
