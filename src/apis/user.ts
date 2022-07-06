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

type UserInfo = {
  data: {
    id: string;
    name: string;
    username: string;
    mid: string;
    profile_image_url: string;
  };
  title?: string;
};

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
  async (
    req: Request & { user: UserInfo },
    res: Response,
    next: NextFunction
  ) => {
    const token = req.headers.authorization as string;
    const user_id = req.user.data.id;
    const user = req.user.data;

    const request = https.request(
      `https://api.twitter.com/2/users/${user_id}/tweets?max_results=100&exclude=replies,retweets&expansions=author_id,attachments.media_keys&media.fields=media_key,type,url,preview_image_url&tweet.fields=created_at`,
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
            data: {
              author_details: {
                name: user.name,
                username: user.username,
                profile_image_url: user.profile_image_url,
              },
              tweets: tweeetsResp.data,
            },
          });
        });
      }
    );
    request.end();
  }
);

export const forwardTweets = catchAsync(
  async (
    req: Request & { user: UserInfo },
    res: Response,
    next: NextFunction
  ) => {
    type ForwardTweets = {
      ids: string[];
      task: "like" | "retweet" | "reply";
    };
    type User = {
      membership: {
        M: {
          subscribed_to: { S: string };
        };
      };
      stats: {
        M: {
          like: { M: Stat };
          retweet: { M: Stat };
          reply: { M: Stat };
        };
      };
      created_at: { S: string };
    };

    type Stat = {
      count: { N: string };
      last_posted: { S: string };
    };

    try {
      const { ids, task } = req.body as ForwardTweets;
      if (["like", "retweet", "reply"].includes(task)) {
        const { mid } = req.user.data;

        // getting user object from DB
        const getUserParams: AWS.DynamoDB.GetItemInput = {
          Key: { id: { S: mid } },
          TableName: "Users",
        };
        dynamodb.getItem(getUserParams, (err, data) => {
          if (err || !data.Item) {
            return next(new AppError(err.message, 503));
          }

          const user = data.Item as unknown as User;
          let {
            count: { N: count },
            last_posted: { S: last_posted },
          } = user.stats.M[task].M;
          let c = +count;
          const sid = user.membership.M.subscribed_to.S;
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
                  c = n;
                  last_posted = created_at.toISOString();
                } else throw new Error("Limit Exceeded");
              } else if (n + c <= limit) {
                last_posted = created_at.toISOString();
                c += n;
              } else throw new Error("Limit Exceeded");

              // adding tweets to DB
              const putTweetsParams: AWS.DynamoDB.BatchWriteItemInput = {
                RequestItems: {
                  Tweets: ids.map((id) => ({
                    PutRequest: {
                      Item: {
                        id: { S: id },
                        task: { S: task },
                        created_by: { S: mid },
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
                  Key: { id: { S: mid } },
                  UpdateExpression: "SET #stats=:stats",
                  ExpressionAttributeNames: {
                    "#stats": "stats",
                  },
                  ExpressionAttributeValues: {
                    ":stats": {
                      M: {
                        ...user.stats.M,
                        [task]: {
                          M: {
                            count: { N: c + "" },
                            last_posted: { S: last_posted },
                          },
                        },
                      },
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

export const likeTweet = catchAsync(
  async (req: Request & { user: any }, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization;
      const { id: user_id, mid } = req.user.data;
      const tweet_id = req.params.tid;

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
          let data: any = "";
          resp.on("data", (chunk) => {
            data += chunk.toString();
          });
          resp.on("error", (err) => {
            console.error(err);
          });
          resp.on("end", () => {
            data = JSON.parse(data);
            if (data.error) {
              return next(new AppError(data.error, 503));
            }

            // adding task record to DB
            const updateTweetParams: AWS.DynamoDB.UpdateItemInput = {
              Key: {
                id: { S: tweet_id },
              },
              AttributeUpdates: {
                acted_by: {
                  Action: "ADD",
                  Value: {
                    L: [{ S: mid }],
                  },
                },
              },
              TableName: "Tweets",
            };

            dynamodb.updateItem(updateTweetParams, (err, data) => {
              if (err) return next(new AppError(err.message, 501));
              res.json({
                status: true,
                message: "Tweet liked",
              });
            });
          });
        }
      );
      request.write(JSON.stringify({ tweet_id }));
      request.end();
    } catch (error) {
      return next(new AppError(error.message, 501));
    }
  }
);

export const retweetTweet = catchAsync(
  async (req: Request & { user: any }, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization;
      const { id: user_id, mid } = req.user.data;
      const tweet_id = req.params.tid;

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
          let data: any = "";
          resp.on("data", (chunk) => {
            data += chunk.toString();
          });
          resp.on("error", (err) => {
            console.error(err);
          });
          resp.on("end", () => {
            data = JSON.parse(data);
            if (data.error) {
              return next(new AppError(data.error, 503));
            }

            // adding task record to DB
            const updateTweetParams: AWS.DynamoDB.UpdateItemInput = {
              Key: {
                id: { S: tweet_id },
              },
              AttributeUpdates: {
                acted_by: {
                  Action: "ADD",
                  Value: {
                    L: [{ S: mid }],
                  },
                },
              },
              TableName: "Tweets",
            };

            dynamodb.updateItem(updateTweetParams, (err, data) => {
              if (err) return next(new AppError(err.message, 501));
              res.json({
                status: true,
                message: "Tweet retweeted",
              });
            });
          });
        }
      );
      request.write(JSON.stringify({ tweet_id }));
      request.end();
    } catch (error) {
      return next(new AppError(error.message, 501));
    }
  }
);

export const replyToTweet = catchAsync(
  async (req: Request & { user: any }, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization;
      const { mid } = req.user.data;
      const tweet_id = req.params.tid;
      const { text } = req.body;

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
          let data: any = "";
          resp.on("data", (chunk) => {
            data += chunk.toString();
          });
          resp.on("error", (err) => {
            console.error(err);
          });
          resp.on("end", () => {
            data = JSON.parse(data);
            if (data.error) {
              return next(new AppError(data.error, 503));
            }

            // adding task record to DB
            const updateTweetParams: AWS.DynamoDB.UpdateItemInput = {
              Key: {
                id: { S: tweet_id },
              },
              AttributeUpdates: {
                acted_by: {
                  Action: "ADD",
                  Value: {
                    L: [{ S: mid }],
                  },
                },
              },
              TableName: "Tweets",
            };

            dynamodb.updateItem(updateTweetParams, (err, data) => {
              if (err) return next(new AppError(err.message, 501));
              res.json({
                status: true,
                message: "Tweet replied to",
              });
            });
          });
        }
      );
      request.write(JSON.stringify(body));
      request.end();
    } catch (error) {
      return next(new AppError(error.message, 501));
    }
  }
);
