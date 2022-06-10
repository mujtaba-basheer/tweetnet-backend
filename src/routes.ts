import { Router } from "express";
import { requestToken, getToken, authorizationUrl } from "./apis/auth";

const router = Router();

// request token
router.get("/request_token", requestToken);

// authorization url
router.get("/authorize", authorizationUrl);

// access token
router.post("/token", getToken);

export default router;
