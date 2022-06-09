"use strict";
exports.__esModule = true;
var express_1 = require("express");
var controller_js_1 = require("./controller.js");
var router = (0, express_1.Router)();
// subscribe
router.post("/subscribe", controller_js_1.addSubscriber);
// contact fontaine
router.post("/contact", controller_js_1.contactFontaine);
// contact fontaine
router.post("/dealer", controller_js_1.locateDealer);
// build trailer
router.post("/build-trailer", controller_js_1.buildTrailer);
// literature
router.post("/literature", controller_js_1.literature);
// enquire
router.post("/enquire", controller_js_1.enquire);
// test
router.get("/subscribers", controller_js_1.getSubscribers);
exports["default"] = router;
