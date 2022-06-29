"use strict";
exports.__esModule = true;
exports.webhookRouter = exports.userRouter = exports.authRouter = void 0;
var auth_1 = require("./auth");
exports.authRouter = auth_1["default"];
var user_1 = require("./user");
exports.userRouter = user_1["default"];
var webhook_1 = require("./webhook");
exports.webhookRouter = webhook_1["default"];
