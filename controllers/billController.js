const Bill = require("../modals/BillingModal");
const Items = require("../modals/itemModal");

// const addNewBill = async (req, res, next) => {
//   try {
//     // console.log(req.body);
//     const data = req.body;
//     const newBill = new Bill({
//       customerName: data.customerName,
//       salesData: data.salesData,
//       subTotal: data.subTotal,
//     });

//     // data.salesData.map((item) => {
//     //   return Items.updateOne(item._id, {
//     //     $set: {
//     //       quantity : quantity - item.quantity,
//     //     },  
//     //   });
//     // });
//     await newBill.save();
//     res.json({ message: "done" });
//   } catch (error) {
//     next(error);
//   }
// };

const addNewBill = async (req, res, next) => {
  try {
    const data = req.body;
    const newBill = new Bill({
      customerName: data.customerName,
      salesData: data.salesData,
      subTotal: data.subTotal,
    });

    // Save the new bill
    await newBill.save();

    // Update the quantity of items in the database
    for (const item of data.salesData) {
      await Items.updateOne(
        { _id: item._id },
        {
          $inc: { quantity: -item.quantity } // Decrease the quantity by item.quantity
        }
      );
    }

    res.json({ message: "done" });
  } catch (error) {
    next(error);
  }
};


const sendBillData = async (req, res, next) => {
  try {
    const bills = await Bill.find().exec();
    res.status(201).json({ message: "done", bills });
  } catch (error) {
    next(error);
  }
};

module.exports = { addNewBill, sendBillData };
