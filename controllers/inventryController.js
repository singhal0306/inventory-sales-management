const Item = require("../modals/itemModal");

const inventory = async (req, res, next) => {
  try {
    const items = await Item.find().exec();
    res.status(201).json({ message: "done", items });
  } catch (error) {
    next(error);
  }
};

// /api/inventory/addtoinventory
const addtoinventory = async (req, res, next) => {
  // const { itemName, manufacturer, quantity, ppp } = req.body;
  // console.log(req.body);
  try {
    Item.create(req.body);
    res.json({ message: "Item added Successfully" });
  } catch (error) {
    next(error);
  }
};

// /api/inventory/delete

const deleteFromInventory = async (req, res, next) =>{
  try {
    console.log(req.params)
    const deleteProduct = await Item.deleteOne({ _id: req.params.id })
    res.json({message: "Item Deleted", deleteProduct});
  } catch (error) {
    next(error)
  }
}
module.exports = { inventory, addtoinventory, deleteFromInventory };
