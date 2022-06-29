"use strict";
exports.__esModule = true;
var express_1 = require("express");
var user_1 = require("../apis/user");
var userRouter = (0, express_1.Router)();
// follows
userRouter.get("/follows", user_1.getFollows);
// tweets
userRouter.get("/my-tweets/:id", user_1.getMyTweets);
// like
userRouter.post("/like", user_1.likeTweet);
// retweet
userRouter.post("/retweet", user_1.retweetTweet);
// reply
userRouter.post("/reply", user_1.replyToTweet);
exports["default"] = userRouter;
