import { Router } from "express";
import {
  addSubscriber,
  getSubscribers,
  contactFontaine,
  locateDealer,
  buildTrailer,
  literature,
  enquire,
} from "./controller.js";

const router = Router();

// subscribe
router.post("/subscribe", addSubscriber);

// contact fontaine
router.post("/contact", contactFontaine);

// contact fontaine
router.post("/dealer", locateDealer);

// build trailer
router.post("/build-trailer", buildTrailer);

// literature
router.post("/literature", literature);

// enquire
router.post("/enquire", enquire);

// test
router.get("/subscribers", getSubscribers);

export default router;
