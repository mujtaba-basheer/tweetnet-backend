import { Router } from "express";
import { requestToken, getToken, authorizationUrl } from "../apis/auth";

const authRouter = Router();

// request token
authRouter.get("/request_token", requestToken);

// authorization url
authRouter.get("/authorize", authorizationUrl);

// access token
authRouter.post("/token", getToken);

export default authRouter;
