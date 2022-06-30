"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookRouter = exports.userRouter = exports.authRouter = void 0;
const auth_1 = require("./auth");
exports.authRouter = auth_1.default;
const user_1 = require("./user");
exports.userRouter = user_1.default;
const webhook_1 = require("./webhook");
exports.webhookRouter = webhook_1.default;
