"use strict";
exports.__esModule = true;
var express_1 = require("express");
var auth_1 = require("./apis/auth");
var router = (0, express_1.Router)();
// request token
router.get("/request_token", auth_1.requestToken);
// authorization url
router.get("/authorize", auth_1.authorizationUrl);
// access token
router.post("/token", auth_1.getToken);
exports["default"] = router;
