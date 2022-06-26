import { Router } from "express";
import { requestToken, getToken, authorizationUrl } from "./apis/auth";
import {
  getFollows,
  getTweets,
  likeTweet,
  replyToTweet,
  retweetTweet,
} from "./apis/user";
import { testWebhook } from "./apis/webhook";

const router = Router();

// request token
router.get("/request_token", requestToken);

// authorization url
router.get("/authorize", authorizationUrl);

// access token
router.post("/token", getToken);

// follows
router.get("/follows", getFollows);

// tweets
router.get("/tweets/:id", getTweets);

// like
router.post("/like", likeTweet);

// retweet
router.post("/retweet", retweetTweet);

// reply
router.post("/reply", replyToTweet);

// webhook
router.post("/webhook", testWebhook);

export default router;
