import { Request, Response } from "express";
import * as https from "https";
import { getUserDetails } from "../utils/user";

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
  request.end();
};

export const getTweets = async (req: Request, res: Response) => {
  const token = req.headers.authorization as string;
  const user_id = req.params.id;

  const request = https.request(
    `https://api.twitter.com/2/users/${user_id}/tweets?max_results=10`,
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
        res.json({
          status: true,
          data: JSON.parse(data),
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
