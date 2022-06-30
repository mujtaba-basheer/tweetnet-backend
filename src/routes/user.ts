import { Router } from "express";
import {
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

// tweets
userRouter.get("/my-tweets", protect, getMyTweets);

// like
userRouter.post("/like", likeTweet);

// retweet
userRouter.post("/retweet", retweetTweet);

// reply
userRouter.post("/reply", replyToTweet);

export default userRouter;
