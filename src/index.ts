import * as express from "express";
import { config } from "dotenv";
import * as cors from "cors";
import { authRouter, userRouter, webhookRouter } from "./routes/index";

// importing error handlers
import { notFound, errorHandler } from "./middleware/error.js";

config();
const app = express();
// app.options("*", cors());
// app.use(cors());
app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  next();
});
app.use(express.json({ limit: "5mb" }));
if (process.env.NODE_ENV === "development") {
  const morgan = require("morgan");
  app.use(morgan("dev"));
}

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/webhook", webhookRouter);

// test endpoint
app.get("/*", (req, res) => {
  res.send("API is running\n");
});

app.use(notFound);
app.use(errorHandler);

// spinning up the server
const port = process.env.PORT || 5000;
app.listen(port, () =>
  console.log(`Server running in ${process.env.NODE_ENV} on port ${port}...`)
);
