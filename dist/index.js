"use strict";
exports.__esModule = true;
var express = require("express");
var dotenv_1 = require("dotenv");
var cors = require("cors");
var index_1 = require("./routes/index");
// importing error handlers
var error_js_1 = require("./middleware/error.js");
(0, dotenv_1.config)();
var app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use("/api/auth", index_1.authRouter);
app.use("/api/user", index_1.userRouter);
app.use("/api/webhook", index_1.webhookRouter);
// test endpoint
app.get("/*", function (req, res) {
    res.send("API is running\n");
});
app.use(error_js_1.notFound);
app.use(error_js_1.errorHandler);
// spinning up the server
var port = process.env.PORT || 5000;
app.listen(port, function () {
    return console.log("Server running in ".concat(process.env.NODE_ENV, " on port ").concat(port, "..."));
});
