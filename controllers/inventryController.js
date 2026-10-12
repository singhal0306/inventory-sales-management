const Item = require("../modals/itemModal");

const normalizeItemText = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const flexibleExactRegex = (value) =>
  new RegExp(`^\\s*${value.split(" ").map(escapeRegex).join("\\s+")}\\s*$`, "i");

const inventory = async (req, res, next) => {
  try {
    const filter = req.query.includeArchived === "true" ? {} : { isActive: { $ne: false } };
    const items = await Item.find(filter)
      .sort({ itemName: 1 })
      .populate({ path: "createdBy", select: "name email" })
      .populate({ path: "updatedBy", select: "name email" })
      .populate({ path: "archivedBy", select: "name email" })
      .populate({ path: "restoredBy", select: "name email" })
      .populate({ path: "stockMovements.performedBy", select: "name email" })
      .exec();
    res.status(200).json({ message: "done", items });
  } catch (error) {
    next(error);
  }
};

// /api/inventory/addtoinventory
const addtoinventory = async (req, res, next) => {
  try {
    const itemName = String(req.body.itemName || "").trim().replace(/\s+/g, " ");
    const manufacturer = String(req.body.manufacturer || "Rajwada").trim().replace(/\s+/g, " ");
    const normalizedItemName = normalizeItemText(itemName);
    const normalizedManufacturer = normalizeItemText(manufacturer);
    const quantity = Number(req.body.quantity);
    if (!normalizedItemName || !normalizedManufacturer) {
      res.status(400);
      throw new Error("Item name and manufacturer are required");
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      res.status(400);
      throw new Error("Initial stock must be a positive whole number");
    }

    const duplicate = await Item.findOne({
      $or: [
        { normalizedItemName, normalizedManufacturer },
        {
          itemName: flexibleExactRegex(normalizedItemName),
          manufacturer: flexibleExactRegex(normalizedManufacturer),
        },
      ],
    }).select("_id itemName manufacturer");

    if (duplicate) {
      res.status(409);
      req.log?.warn(
        {
          event: "inventory.item.duplicate_rejected",
          existingItemId: String(duplicate._id),
        },
        "Duplicate item name and manufacturer rejected"
      );
      throw new Error("An item with this name and manufacturer already exists");
    }

    const item = await Item.create({
      itemName,
      manufacturer,
      normalizedItemName,
      normalizedManufacturer,
      quantity,
      ppp: req.body.ppp,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      stockMovements: [{ movementType: "initial", quantity, performedBy: req.user._id }],
    });
    req.log?.info(
      {
        event: "inventory.item.created",
        itemId: String(item._id),
        initialQuantity: quantity,
      },
      "Inventory item created"
    );
    res.status(201).json({ message: "Item added Successfully", item });
  } catch (error) {
    if (error.code === 11000) {
      res.status(409);
      error.message = "An item with this name and manufacturer already exists";
    }
    next(error);
  }
};

const addStock = async (req, res, next) => {
  try {
    const quantity = Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      res.status(400);
      throw new Error("Restock quantity must be a positive whole number");
    }

    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, isActive: { $ne: false } },
      {
        $inc: { quantity },
        $push: {
          stockMovements: {
            movementType: "restock",
            quantity,
            performedBy: req.user._id,
          },
        },
        $set: { updatedBy: req.user._id },
      },
      { new: true, runValidators: true }
    );

    if (!item) {
      res.status(404);
      throw new Error("Item not found");
    }

    req.log?.info(
      {
        event: "inventory.item.restocked",
        itemId: String(item._id),
        quantityAdded: quantity,
        quantityOnHand: item.quantity,
      },
      "Inventory item restocked"
    );
    res.status(200).json({ message: "Stock added successfully", item });
  } catch (error) {
    next(error);
  }
};

// /api/inventory/delete

const archiveFromInventory = async (req, res, next) => {
  try {
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          isActive: false,
          archivedBy: req.user._id,
          archivedAt: new Date(),
          updatedBy: req.user._id,
        },
      },
      { new: true }
    );
    if (!item) {
      res.status(404);
      throw new Error("Item not found");
    }
    req.log?.info(
      { event: "inventory.item.archived", itemId: String(item._id) },
      "Inventory item archived"
    );
    res.status(200).json({ message: "Item archived. Existing bills and stock history are preserved.", item });
  } catch (error) {
    next(error);
  }
};

const restoreToInventory = async (req, res, next) => {
  try {
    const item = await Item.findByIdAndUpdate(
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
    );
    if (!item) {
      res.status(404);
      throw new Error("Item not found");
    }
    req.log?.info(
      { event: "inventory.item.restored", itemId: String(item._id) },
      "Inventory item restored"
    );
    res.status(200).json({ message: "Item restored to active inventory", item });
  } catch (error) {
    next(error);
  }
};

module.exports = { inventory, addtoinventory, addStock, archiveFromInventory, restoreToInventory };
