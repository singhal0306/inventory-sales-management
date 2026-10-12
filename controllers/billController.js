const mongoose = require("mongoose");
const Bill = require("../modals/BillingModal");
const Items = require("../modals/itemModal");
const { resolveCustomer } = require("../services/customerService");

const billError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const addNewBill = async (req, res, next) => {
  const deductedItems = [];

  try {
    const data = req.body;
    if (!data || !Array.isArray(data.salesData) || data.salesData.length === 0) {
      throw billError("A bill must contain at least one item", 400);
    }

    const quantitiesByItem = new Map();
    for (const line of data.salesData) {
      const itemId = line?._id || line?.itemId;
      const quantity = Number(line?.quantity);
      if (
        !mongoose.Types.ObjectId.isValid(itemId) ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        throw billError("Each bill line needs a valid item ID and positive whole quantity", 400);
      }

      const key = String(itemId);
      quantitiesByItem.set(key, (quantitiesByItem.get(key) || 0) + quantity);
    }

    const billLines = [];
    for (const [itemId, quantity] of quantitiesByItem) {
      const item = await Items.findOneAndUpdate(
        { _id: itemId, isActive: { $ne: false }, quantity: { $gte: quantity } },
        { $inc: { quantity: -quantity } },
        { new: true }
      );

      if (!item) {
        throw billError(`Item ${itemId} was not found or has insufficient stock`, 409);
      }

      deductedItems.push({ itemId, quantity });
      const ppp = Number(item.ppp);
      billLines.push({
        item: item._id,
        quantity,
        ppp,
        price: Number((ppp * quantity).toFixed(2)),
      });
    }

    const customer = await resolveCustomer({
      customerId: data.customerId,
      customerName: data.customerName,
      companyName: data.companyName,
      email: data.email,
      phone: data.phone,
      actorId: req.user._id,
    });

    const itemsTotal = billLines.reduce((total, line) => total + line.price, 0);
    const subTotal = Number((itemsTotal * 1.05).toFixed(2));
    const bill = await Bill.create({
      customer: customer._id,
      createdBy: req.user._id,
      salesData: billLines,
      subTotal,
    });

    await bill.populate([
      {
        path: "customer",
        select: "customerName companyName email phone createdBy updatedBy archivedBy restoredBy createdAt updatedAt archivedAt restoredAt",
        populate: [
          { path: "createdBy", select: "name email" },
          { path: "updatedBy", select: "name email" },
          { path: "archivedBy", select: "name email" },
          { path: "restoredBy", select: "name email" },
        ],
      },
      { path: "salesData.item", select: "itemName manufacturer" },
      { path: "createdBy", select: "name email" },
    ]);
    req.log?.info(
      {
        event: "billing.bill.created",
        billId: String(bill._id),
        customerId: String(customer._id),
        lineItemCount: billLines.length,
        unitsSold: billLines.reduce((total, line) => total + line.quantity, 0),
        total: subTotal,
      },
      "Bill created"
    );
    res.status(201).json({ message: "Bill created", bill });
  } catch (error) {
    if (deductedItems.length > 0) {
      try {
        await Promise.all(
          deductedItems.map(({ itemId, quantity }) =>
            Items.updateOne({ _id: itemId }, { $inc: { quantity } })
          )
        );
      } catch (rollbackError) {
        error.rollbackError = rollbackError;
        req.log?.fatal(
          { event: "billing.stock.rollback.failed", err: rollbackError },
          "Stock rollback failed after bill creation error"
        );
      }
    }

    next(error);
  }
};

const sendBillData = async (req, res, next) => {
  try {
    const bills = await Bill.find()
      .sort({ createdAt: -1 })
      .populate({
        path: "customer",
        select: "customerName companyName email phone createdBy updatedBy archivedBy restoredBy createdAt updatedAt archivedAt restoredAt",
        populate: [
          { path: "createdBy", select: "name email" },
          { path: "updatedBy", select: "name email" },
          { path: "archivedBy", select: "name email" },
          { path: "restoredBy", select: "name email" },
        ],
      })
      .populate({ path: "salesData.item", select: "itemName manufacturer" })
      .populate({ path: "createdBy", select: "name email" })
      .exec();
    res.status(200).json({ message: "done", bills });
  } catch (error) {
    next(error);
  }
};

module.exports = { addNewBill, sendBillData };
