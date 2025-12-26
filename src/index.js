const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { connectDatabase } = require("./config/prisma");

const apiRoutes = require("./routes/api");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api", apiRoutes);

app.get("/", (req, res) => {
  res.send("x-site-backend is running");
});

app.listen(PORT, () => {
  connectDatabase();
  console.log(`Backend running on port ${PORT}`);
});

module.exports = app;
