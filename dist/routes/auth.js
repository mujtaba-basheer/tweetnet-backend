"use strict";
exports.__esModule = true;
var express_1 = require("express");
var auth_1 = require("../apis/auth");
var authRouter = (0, express_1.Router)();
// request token
authRouter.get("/request_token", auth_1.requestToken);
// authorization url
authRouter.get("/authorize", auth_1.authorizationUrl);
// access token
authRouter.post("/token", auth_1.getToken);
exports["default"] = authRouter;
