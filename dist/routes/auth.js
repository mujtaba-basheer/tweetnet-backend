"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../apis/auth");
const authRouter = (0, express_1.Router)();
// authorization url
authRouter.get("/authorize", auth_1.authorizationUrl);
// access token
authRouter.post("/token", auth_1.getToken);
exports.default = authRouter;
