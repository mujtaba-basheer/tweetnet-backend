import * as express from "express";
import { config } from "dotenv";
import * as cors from "cors";
import routes from "./routes.js";

// importing error handlers
// import { notFound, errorHandler } from "./middleware/error.js";

config();
const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.use("/api", routes);

// test endpoint
app.get("/", (req, res) => {
  res.send("API is running\n");
});

// app.use(notFound);
// app.use(errorHandler);

// spinning up the server
const port = process.env.PORT || 5000;
app.listen(port, () =>
  console.log(`Server running in ${process.env.NODE_ENV} on port ${port}...`)
);
