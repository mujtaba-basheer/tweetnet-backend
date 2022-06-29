"use strict";
exports.__esModule = true;
var express_1 = require("express");
var webhook_1 = require("../apis/webhook");
var webhookRouter = (0, express_1.Router)();
// member added
webhookRouter.post("/member-added", webhook_1.memberAdded);
// member deleted
webhookRouter.post("/member-deleted", webhook_1.memberDeleted);
exports["default"] = webhookRouter;
