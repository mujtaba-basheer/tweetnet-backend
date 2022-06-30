import { NextFunction, Request, Response } from "express";
import { config } from "dotenv";
import * as https from "https";
import AppError from "../utils/app-error";
import catchAsync from "../utils/catch-async";
import { getUserDetails } from "../utils/user";
import * as AWS from "aws-sdk";
import limits from "../data/subscription";
config();

const credentials = new AWS.Credentials({
  accessKeyId: process.env.DYNAMODB_ACCESS_KEY_ID,
  secretAccessKey: process.env.DYNAMODB_ACCESS_KEY_SECRET,
});
const dynamodb = new AWS.DynamoDB({
  apiVersion: "2012-08-10",
  endpoint: "dynamodb.ap-south-1.amazonaws.com",
  credentials,
  region: "ap-south-1",
});

type AuthorDetail = {
  id: string;
  profile_image_url: string;
  username: string;
  name: string;
};

type MediaDetail =
  | {
      media_key: string;
      type: "video";
      preview_image_url: string;
    }
  | {
      media_key: string;
      type: "photo";
      url: string;
    };

type TweetsResp = {
  data: {
    text: string;
    id: string;
    author_id: string;
    author_details: AuthorDetail;
    attachments?: {
      media_keys: string[];
    };
    attachement_urls: string[];
  }[];
  includes: {
    media: MediaDetail[];
    users: AuthorDetail[];
  };
  meta: {
    result_count: number;
    newest_id: string;
    oldest_id: string;
    next_token: string;
  };
  title?: string;
};

export const getFollows = async (req: Request, res: Response) => {
  const token = req.headers.authorization as string;
  const user_id = (await getUserDetails(token)).data.id;

  const request = https.request(
    `https://api.twitter.com/2/users/${user_id}/followers?max_results=10`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    (resp) => {
      let data: string = "";
      resp.on("data", (chunk) => {
        data += chunk.toString();
      });
      resp.on("error", (err) => {
        console.error(err);
      });
      resp.on("end", () => {
        res.json({
          status: true,
          data: JSON.parse(data),
        });
      });
    }
  );
  request.end();
};

export const getMyTweets = catchAsync(
  async (req: Request & { user: any }, res: Response, next: NextFunction) => {
    const token = req.headers.authorization as string;
    const user_id = req.user.data.id;

    const request = https.request(
      `https://api.twitter.com/2/users/${user_id}/tweets?max_results=100&exclude=replies,retweets&expansions=author_id,attachments.media_keys&media.fields=media_key,type,url,preview_image_url&user.fields=profile_image_url`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      (resp) => {
        let data = "";
        resp.on("data", (chunk) => {
          data += chunk.toString();
        });
        resp.on("error", (err) => {
          return next(new AppError(err.message, 503));
        });
        resp.on("end", () => {
          const tweeetsResp: TweetsResp = JSON.parse(data);

          if (resp.statusCode !== 200)
            return next(new AppError(tweeetsResp.title, resp.statusCode));

          const { data: tweets, includes, meta } = tweeetsResp;

          for (const tweet of tweets) {
            const { author_id } = tweet;
            tweet.author_details = includes.users.find(
              ({ id }) => id === author_id
            );

            if (tweet.attachments && tweet.attachments.media_keys.length > 0) {
              for (const media_key of tweet.attachments.media_keys) {
                const media = includes.media.find(
                  (x) => x.media_key === media_key
                );
                let url: string;
                if (media) {
                  if (media.type === "photo") url = media.url;
                  else url = media.preview_image_url;

                  if (!tweet.attachement_urls) {
                    tweet.attachement_urls = [url];
                  } else tweet.attachement_urls.push(url);
                }
              }
            }
          }
          for (const tweet of tweets) {
            delete tweet.attachments;
          }

          res.json({
            status: true,
            data: { data: tweeetsResp.data, meta },
          });
        });
      }
    );
    request.end();
  }
);

export const forwardTweets = catchAsync(
  async (req: Request & { user: any }, res: Response, next: NextFunction) => {
    type ForwardTweets = {
      ids: string[];
      task: "like" | "retweet" | "reply";
    };
    type User = {
      email: string;
      id: string;
      name: string;
      profile: {
        usernames: string[];
      };
      membership: {
        id: string;
        status: string;
        subscribed_to: string;
      };
      stats: {
        like: Stat;
        retweet: Stat;
        reply: Stat;
      };
      created_at: string;
    };

    type Stat = {
      count: number;
      last_posted: string;
    };

    try {
      const { ids, task } = req.body as ForwardTweets;
      if (["like", "retweet", "reply"].includes(task)) {
        const user_id = req.user.data.id;

        // getting user object from DB
        const getUserParams: AWS.DynamoDB.GetItemInput = {
          Key: { id: { S: user_id } },
          TableName: "Users",
        };
        dynamodb.getItem(getUserParams, (err, data) => {
          if (err) {
            console.log(err);
            return next(new AppError(err.message, 503));
          }
          console.log(data, user_id);

          const user = data.Item as User;
          let { count, last_posted } = user.stats[task];
          const sid = user.membership.subscribed_to;
          const n = ids.length;
          const limit_o = limits.find((x) => x.sid === sid);

          // checking daily limits
          if (limit_o) {
            const limit = limit_o.limit[task];
            const created_at = new Date();
            const created_at_date = created_at.toISOString().substring(0, 10);
            const last_posted_date = last_posted.substring(0, 10);

            try {
              if (last_posted_date < created_at_date) {
                if (n <= limit) {
                  count = n;
                  last_posted = created_at.toISOString();
                } else throw new Error("Limit Exceeded");
              } else if (n + count <= limit) {
                last_posted = created_at.toISOString();
                count += n;
              } else throw new Error("Limit Exceeded");

              // adding tweets to DB
              const putTweetsParams: AWS.DynamoDB.BatchWriteItemInput = {
                RequestItems: {
                  Tweets: ids.map((id) => ({
                    PutRequest: {
                      Item: {
                        id: { S: id },
                        task: { S: task },
                        created_by: { S: user_id },
                        acted_by: { L: [] },
                        created_at: { S: created_at.toISOString() },
                      },
                    },
                  })),
                },
              };

              dynamodb.batchWriteItem(putTweetsParams, (err, data) => {
                if (err) return next(new AppError(err.message, 503));

                // updating user data in DB
                const updateUserParams: AWS.DynamoDB.UpdateItemInput = {
                  Key: { user_id: { S: user_id } },
                  UpdateExpression: `SET stats.${task}.count = :c, stats.${task}.last_posted = :l_p`,
                  ExpressionAttributeValues: {
                    ":c": {
                      N: count + "",
                    },
                    ":l_p": {
                      S: last_posted,
                    },
                  },
                  TableName: "Users",
                };
                dynamodb.updateItem(updateUserParams, (err, data) => {
                  if (err) return next(new AppError(err.message, 503));
                  res.json({
                    status: true,
                    message: "Tweets forwarded successfully",
                  });
                });
              });
            } catch (error) {
              return next(new AppError(error.message, 400));
            }
          } else return next(new AppError("Subscription not found", 404));
        });
      } else return next(new AppError("Bad Request", 400));
    } catch (error) {
      return next(new AppError(error.message, 501));
    }
  }
);

export const getTweets = async (req: Request, res: Response) => {
  const token = req.headers.authorization as string;
  const user_id = req.params.id;

  const request = https.request(
    `https://api.twitter.com/2/users/${user_id}/tweets?expansions=author_id,attachments.media_keys&media.fields=media_key,type,url,preview_image_url&user.fields=profile_image_url`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    (resp) => {
      let data = "";
      resp.on("data", (chunk) => {
        data += chunk.toString();
      });
      resp.on("error", (err) => {
        console.error(err);
      });
      resp.on("end", () => {
        const tweeetsResp: TweetsResp = JSON.parse(data);
        const { data: tweets, includes, meta } = tweeetsResp;

        for (const tweet of tweets) {
          const { author_id } = tweet;
          tweet.author_details = includes.users.find(
            ({ id }) => id === author_id
          );

          if (tweet.attachments && tweet.attachments.media_keys.length > 0) {
            for (const media_key of tweet.attachments.media_keys) {
              const media = includes.media.find(
                (x) => x.media_key === media_key
              );
              let url: string;
              if (media) {
                if (media.type === "photo") url = media.url;
                else url = media.preview_image_url;

                if (!tweet.attachement_urls) {
                  tweet.attachement_urls = [url];
                } else tweet.attachement_urls.push(url);
              }
            }
          }
        }
        for (const tweet of tweets) {
          delete tweet.attachments;
        }

        res.json({
          status: true,
          data: { data: tweeetsResp.data, meta },
        });
      });
    }
  );
  request.end();
};

export const likeTweet = async (req: Request, res: Response) => {
  const token = req.headers.authorization as string;
  const user_id = (await getUserDetails(token)).data.id;
  const tweet_id = req.body.tweet_id;
  console.log({ body: req.body });

  const request = https.request(
    `https://api.twitter.com/2/users/${user_id}/likes`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
    (resp) => {
      let data = "";
      resp.on("data", (chunk) => {
        data += chunk.toString();
      });
      resp.on("error", (err) => {
        console.error(err);
      });
      resp.on("end", () => {
        console.log(JSON.parse(data));
        res.json({
          status: true,
          data: JSON.parse(data),
        });
      });
    }
  );
  request.write(JSON.stringify({ tweet_id }));
  request.end();
};

export const retweetTweet = async (req: Request, res: Response) => {
  const token = req.headers.authorization as string;
  const user_id = (await getUserDetails(token)).data.id;
  const tweet_id = req.body.tweet_id;

  const request = https.request(
    `https://api.twitter.com/2/users/${user_id}/retweets`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
    (resp) => {
      let data = "";
      resp.on("data", (chunk) => {
        data += chunk.toString();
      });
      resp.on("error", (err) => {
        console.error(err);
      });
      resp.on("end", () => {
        res.json({
          status: true,
          data: JSON.parse(data),
        });
      });
    }
  );
  request.write(JSON.stringify({ tweet_id }));
  request.end();
};

export const replyToTweet = async (req: Request, res: Response) => {
  const token = req.headers.authorization as string;
  const { tweet_id, text } = req.body;

  const body = {
    text,
    reply: {
      in_reply_to_tweet_id: tweet_id,
    },
  };

  const request = https.request(
    "https://api.twitter.com/2/tweets",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
    (resp) => {
      let data = "";
      resp.on("data", (chunk) => {
        data += chunk.toString();
      });
      resp.on("error", (err) => {
        console.error(err);
      });
      resp.on("end", () => {
        res.json({
          status: true,
          data: JSON.parse(data),
        });
      });
    }
  );
  request.write(JSON.stringify(body));
  request.end();
};
