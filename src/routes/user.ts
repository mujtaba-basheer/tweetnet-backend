import { Router } from "express";
import {
  forwardTweets,
  getFollows,
  getMyTweets,
  likeTweet,
  replyToTweet,
  retweetTweet,
} from "../apis/user";
import { protect } from "../middleware/auth";

const userRouter = Router();

// follows
userRouter.get("/follows", getFollows);

// my tweets
userRouter.get("/my-tweets", protect, getMyTweets);

// forward tweets
userRouter.post("/forward-tweets", protect, forwardTweets);

// like
userRouter.post("/like", likeTweet);

// retweet
userRouter.post("/retweet", retweetTweet);

// reply
userRouter.post("/reply", replyToTweet);

export default userRouter;
