import { Router } from "express";
import {
  memberAdded,
  memberDeleted,
  membershipCanceled,
  membershipChanged,
  memberUpdated,
} from "../apis/webhook";

const webhookRouter = Router();

// member added
webhookRouter.post("/member-added", memberAdded);

// member deleted
webhookRouter.post("/member-deleted", memberDeleted);

// member updated
webhookRouter.post("/member-updated", memberUpdated);

// membership changed
webhookRouter.post("/membership-changed", membershipChanged);

// membership cancelled
webhookRouter.post("/membership-canceled", membershipCanceled);

export default webhookRouter;
