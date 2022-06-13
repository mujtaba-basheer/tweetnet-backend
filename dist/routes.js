"use strict";
exports.__esModule = true;
var express_1 = require("express");
var auth_1 = require("./apis/auth");
var user_1 = require("./apis/user");
var router = (0, express_1.Router)();
// request token
router.get("/request_token", auth_1.requestToken);
// authorization url
router.get("/authorize", auth_1.authorizationUrl);
// access token
router.post("/token", auth_1.getToken);
// follows
router.get("/follows", user_1.getFollows);
// tweets
router.get("/tweets/:id", user_1.getTweets);
// like
router.post("/like/:id", user_1.likeTweet);
// retweet
router.post("/retweet/:id", user_1.retweetTweet);
exports["default"] = router;
