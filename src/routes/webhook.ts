import { Router } from "express";
import { memberAdded, memberDeleted, memberUpdated } from "../apis/webhook";

const webhookRouter = Router();

// member added
webhookRouter.post("/member-added", memberAdded);

// member deleted
webhookRouter.post("/member-deleted", memberDeleted);

// member updated
webhookRouter.post("/member-updated", memberUpdated);

export default webhookRouter;
