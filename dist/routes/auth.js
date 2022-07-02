"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../apis/auth");
const auth_2 = require("../middleware/auth");
const authRouter = (0, express_1.Router)();
// authorization url
authRouter.get("/authorize", auth_1.authorizationUrl);
// access token
authRouter.post("/token", auth_1.getToken);
// refresh token
authRouter.post("/refresh-token", auth_2.validate, auth_1.getFreshToken);
// logout
authRouter.get("/logout", auth_2.protect, auth_1.logout);
exports.default = authRouter;
