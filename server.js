require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");

mongoose.connect(process.env.mongoUrl);

const userRoute = require("./routes/userRoute");
const inventoryRoute = require("./routes/inventoryRoute")
const billingRoute = require("./routes/billingRoute")
const errorHandler = require("./controllers/errorMiddleware");

const app = express();
const port = process.env.port || 8000;

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

mongoose.connection.on("connected", () => {
  console.log("Connected to MongoDB SuccessFully!");
});

mongoose.connection.on("error", (err) => {
  console.error(`MongoDB connection error: ${err}`);
});

app.use("/api/user", userRoute);
app.use("/api/inventory", inventoryRoute)
app.use("/api/bill", billingRoute);

app.get("/", (req, res) => {
  res.send("Hello from the server!");
});

app.use(errorHandler);

app.listen(port, (err) => {
  if (err) console.log(err);
  console.log(`Server is up and running on port: ${port}`);
});
