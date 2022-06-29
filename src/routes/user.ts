import { Router } from "express";
import {
  getFollows,
  getTweets,
  likeTweet,
  replyToTweet,
  retweetTweet,
} from "../apis/user";

const userRouter = Router();

// follows
userRouter.get("/follows", getFollows);

// tweets
userRouter.get("/tweets/:id", getTweets);

// like
userRouter.post("/like", likeTweet);

// retweet
userRouter.post("/retweet", retweetTweet);

// reply
userRouter.post("/reply", replyToTweet);

export default userRouter;
