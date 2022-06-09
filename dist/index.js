"use strict";
exports.__esModule = true;
var express = require("express");
var dotenv_1 = require("dotenv");
var cors = require("cors");
// import routes from "./routes.js";
// importing error handlers
// import { notFound, errorHandler } from "./middleware/error.js";
(0, dotenv_1.config)();
var app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));
// app.use("/api", routes);
// test endpoint
app.get("/", function (req, res) {
    res.send("API is running\n");
});
// app.use(notFound);
// app.use(errorHandler);
// spinning up the server
var port = process.env.PORT || 5000;
app.listen(port, function () {
    return console.log("Server running in ".concat(process.env.NODE_ENV, " on port ").concat(port, "..."));
});
