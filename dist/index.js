"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const dotenv_1 = require("dotenv");
const cors = require("cors");
const index_1 = require("./routes/index");
// importing error handlers
const error_js_1 = require("./middleware/error.js");
(0, dotenv_1.config)();
const app = express();
app.options("*", cors());
app.use(cors());
app.use(express.json({ limit: "5mb" }));
if (process.env.NODE_ENV === "development") {
    const morgan = require("morgan");
    app.use(morgan("dev"));
}
app.use("/api/auth", index_1.authRouter);
app.use("/api/user", index_1.userRouter);
app.use("/api/webhook", index_1.webhookRouter);
// test endpoint
app.get("/*", (req, res) => {
    res.send("API is running\n");
});
app.use(error_js_1.notFound);
app.use(error_js_1.errorHandler);
// spinning up the server
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running in ${process.env.NODE_ENV} on port ${port}...`));
