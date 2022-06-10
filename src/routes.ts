import { Router } from "express";
import { requestToken, callback, authorizationUrl } from "./apis/auth";

const router = Router();

// request token
router.get("/request_token", requestToken);

// authorization url
router.get("/authorize", authorizationUrl);

// callback
router.post("/callback", callback);

export default router;
