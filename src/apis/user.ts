import { NextFunction, Request, Response } from "express";
import * as https from "https";
import AppError from "../utils/app-error";
import catchAsync from "../utils/catch-async";
import { getUserDetails } from "../utils/user";

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
  async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization as string;
    const user_id = (await getUserDetails(token)).data.id;

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
          return next(new AppError(err.message, 503));
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
