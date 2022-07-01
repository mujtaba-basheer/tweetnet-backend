import { Router } from "express";
import {
  getToken,
  authorizationUrl,
  logout,
  getFreshToken,
} from "../apis/auth";

const authRouter = Router();

// authorization url
authRouter.get("/authorize", authorizationUrl);

// access token
authRouter.post("/token", getToken);

// refresh token
authRouter.post("/refresh-token", getFreshToken);

// logout
authRouter.get("/logout", logout);

export default authRouter;
