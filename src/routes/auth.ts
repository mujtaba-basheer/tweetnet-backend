import { Router } from "express";
import {
  getToken,
  authorizationUrl,
  logout,
  getFreshToken,
} from "../apis/auth";
import { protect, validate } from "../middleware/auth";

const authRouter = Router();

// authorization url
authRouter.get("/authorize", authorizationUrl);

// access token
authRouter.post("/token", getToken);

// refresh token
authRouter.post("/refresh-token", validate, getFreshToken);

// logout
authRouter.get("/logout", protect, logout);

export default authRouter;
