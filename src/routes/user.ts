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
userRouter.get("/follows", protect, getFollows);

// my tweets
userRouter.get("/my-tweets", protect, getMyTweets);

// forward tweets
userRouter.post("/forward-tweets", protect, forwardTweets);

// like
userRouter.get("/like/:tid", protect, likeTweet);

// retweet
userRouter.get("/retweet/:tid", protect, retweetTweet);

// reply
userRouter.post("/reply/:tid", protect, replyToTweet);

export default userRouter;
