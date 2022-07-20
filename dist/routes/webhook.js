"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const webhook_1 = require("../apis/webhook");
const webhookRouter = (0, express_1.Router)();
// member added
webhookRouter.post("/member-added", webhook_1.memberAdded);
// member deleted
webhookRouter.post("/member-deleted", webhook_1.memberDeleted);
// member updated
webhookRouter.post("/member-updated", webhook_1.memberUpdated);
// membership changed
webhookRouter.post("/membership-changed", webhook_1.membershipChanged);
// membership cancelled
webhookRouter.post("/membership-canceled", webhook_1.membershipCanceled);
exports.default = webhookRouter;
