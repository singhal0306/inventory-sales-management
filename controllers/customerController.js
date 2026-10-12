const mongoose = require("mongoose");
const Customer = require("../modals/CustomerModal");
const Bill = require("../modals/BillingModal");
const {
  normalizeCustomerName,
  normalizeEmail,
  normalizePhone,
} = require("../services/customerService");

const customerError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const handleDatabaseError = (error) => {
  if (error.code === 11000) {
    error.statusCode = 409;
    const duplicateField = Object.keys(error.keyPattern || {})[0];
    error.message = duplicateField
      ? `Another customer already uses this ${duplicateField}`
      : "A customer with this name, email, or phone number already exists";
  }
  return error;
};

const getCustomers = async (req, res, next) => {
  try {
    const filter = req.query.includeArchived === "true" ? {} : { isActive: { $ne: false } };
    const customers = await Customer.find(filter)
      .sort({ customerName: 1 })
      .populate({ path: "createdBy", select: "name email" })
      .populate({ path: "updatedBy", select: "name email" })
      .populate({ path: "archivedBy", select: "name email" })
      .populate({ path: "restoredBy", select: "name email" })
      .lean();
    res.status(200).json({ customers });
  } catch (error) {
    next(error);
  }
};

const createCustomer = async (req, res, next) => {
  try {
    const customerName = String(req.body.customerName || "").trim().replace(/\s+/g, " ");
    const normalizedName = normalizeCustomerName(customerName);
    if (!normalizedName) {
      throw customerError("Customer name is required", 400);
    }

    const customer = await Customer.create({
      customerName,
      normalizedName,
      companyName: String(req.body.companyName || "").trim().replace(/\s+/g, " ") || undefined,
      email: normalizeEmail(req.body.email),
      phone: normalizePhone(req.body.phone),
      createdBy: req.user._id,
    });
    await customer.populate([
      { path: "createdBy", select: "name email" },
      { path: "updatedBy", select: "name email" },
    ]);
    req.log?.info(
      { event: "customer.created", customerId: String(customer._id) },
      "Customer created"
    );
    res.status(201).json({ message: "Customer created", customer });
  } catch (error) {
    next(handleDatabaseError(error));
  }
};

const updateCustomer = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw customerError("Invalid customer ID", 400);
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      throw customerError("Customer not found", 404);
    }

    const customerName = String(req.body.customerName || "").trim().replace(/\s+/g, " ");
    const normalizedName = normalizeCustomerName(customerName);
    if (!normalizedName) {
      throw customerError("Customer name is required", 400);
    }

    const updates = {
      customerName,
      normalizedName,
      updatedBy: req.user._id,
    };
    const unset = {};
    const companyName = String(req.body.companyName || "").trim().replace(/\s+/g, " ");
    const email = normalizeEmail(req.body.email);
    const phone = normalizePhone(req.body.phone);

    for (const [field, value] of Object.entries({ companyName, email, phone })) {
      if (value) {
        updates[field] = value;
      } else {
        unset[field] = 1;
      }
    }

    const update = { $set: updates };
    if (Object.keys(unset).length > 0) update.$unset = unset;
    const updatedCustomer = await Customer.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    ).populate([
      { path: "createdBy", select: "name email" },
      { path: "updatedBy", select: "name email" },
    ]);
    req.log?.info(
      { event: "customer.updated", customerId: String(updatedCustomer._id) },
      "Customer updated"
    );
    res.status(200).json({ message: "Customer updated", customer: updatedCustomer });
  } catch (error) {
    next(handleDatabaseError(error));
  }
};

const deleteCustomer = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw customerError("Invalid customer ID", 400);
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      throw customerError("Customer not found", 404);
    }

    if (await Bill.exists({ customer: customer._id })) {
      customer.isActive = false;
      customer.archivedBy = req.user._id;
      customer.archivedAt = new Date();
      customer.updatedBy = req.user._id;
      await customer.save();
      await customer.populate([
        { path: "createdBy", select: "name email" },
        { path: "updatedBy", select: "name email" },
        { path: "archivedBy", select: "name email" },
      ]);
      req.log?.info(
        { event: "customer.archived", customerId: String(customer._id), reason: "linked_bills" },
        "Customer archived to preserve bill references"
      );
      res.status(200).json({ message: "Customer archived to preserve existing bills", customer });
      return;
    }

    await customer.deleteOne();
    req.log?.info(
      { event: "customer.deleted", customerId: String(customer._id) },
      "Unreferenced customer deleted"
    );
    res.status(200).json({ message: "Customer deleted" });
  } catch (error) {
    next(error);
  }
};

const restoreCustomer = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw customerError("Invalid customer ID", 400);
    }

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          isActive: true,
          restoredBy: req.user._id,
          restoredAt: new Date(),
          updatedBy: req.user._id,
        },
      },
      { new: true }
    ).populate([
      { path: "createdBy", select: "name email" },
      { path: "updatedBy", select: "name email" },
      { path: "archivedBy", select: "name email" },
      { path: "restoredBy", select: "name email" },
    ]);
    if (!customer) {
      throw customerError("Customer not found", 404);
    }

    req.log?.info(
      { event: "customer.restored", customerId: String(customer._id) },
      "Customer restored"
    );
    res.status(200).json({ message: "Customer restored", customer });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCustomers, createCustomer, updateCustomer, deleteCustomer, restoreCustomer };
