import { Router } from "express";
import {
  forwardTweets,
  getFollows,
  getMyTweets,
  getTweetsByTask,
  likeTweet,
  replyToTweet,
  retweetTweet,
} from "../apis/user";
import { protect } from "../middleware/auth";

const userRouter = Router();

// follows
userRouter.get("/follows", protect, getFollows);

// my tweets
userRouter.get("/my-tweets", protect, getMyTweets);

// tweets by task
userRouter.get("/tweets/:task", protect, getTweetsByTask);

// forward tweets
userRouter.post("/forward-tweets", protect, forwardTweets);

// like
userRouter.get("/like/:tid", protect, likeTweet);

// retweet
userRouter.get("/retweet/:tid", protect, retweetTweet);

// reply
userRouter.post("/reply/:tid", protect, replyToTweet);

export default userRouter;
