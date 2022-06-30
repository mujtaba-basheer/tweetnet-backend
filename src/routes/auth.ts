import { Router } from "express";
import { getToken, authorizationUrl } from "../apis/auth";

const authRouter = Router();

// authorization url
authRouter.get("/authorize", authorizationUrl);

// access token
authRouter.post("/token", getToken);

export default authRouter;
