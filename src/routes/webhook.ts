import { Router } from "express";
import { memberAdded, memberDeleted } from "../apis/webhook";

const webhookRouter = Router();

// member added
webhookRouter.post("/member-added", memberAdded);

// member deleted
webhookRouter.post("/member-deleted", memberDeleted);

export default webhookRouter;
