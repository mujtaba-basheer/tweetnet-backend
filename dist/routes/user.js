"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_1 = require("../apis/user");
const auth_1 = require("../middleware/auth");
const userRouter = (0, express_1.Router)();
// follows
userRouter.get("/follows", auth_1.protect, user_1.getFollows);
// my tweets
userRouter.get("/my-tweets", auth_1.protect, user_1.getMyTweets);
// forward tweets
userRouter.post("/forward-tweets", auth_1.protect, user_1.forwardTweets);
// like
userRouter.post("/like", user_1.likeTweet);
// retweet
userRouter.post("/retweet", user_1.retweetTweet);
// reply
userRouter.post("/reply", user_1.replyToTweet);
exports.default = userRouter;
