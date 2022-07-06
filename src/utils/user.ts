import * as https from "https";
import AppError from "./app-error";

type UserInfo = {
  data: {
    id: string;
    name: string;
    username: string;
    mid: string;
  };
  title?: string;
};

export const getUserDetails: (token: string) => Promise<UserInfo> = (
  token: string
) => {
  return new Promise((res, rej) => {
    const request = https.request(
      "https://api.twitter.com/2/users/me?user.fields=profile_image_url,name,username",
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
        resp.on("close", () => {
          const user = JSON.parse(data) as UserInfo;
          if (resp.statusCode === 200) res(user);
          else rej(new AppError(user.title, resp.statusCode));
        });
        resp.on("error", (err) => rej(err));
      }
    );
    request.end();
  });
};

export const checkTweetLike = (
  userId: string,
  tweetId: string,
  token: string
) => {
  return new Promise((res, rej) => {
    const request = https.request(
      `https://api.twitter.com/2/tweets/${tweetId}/liking_users?user.fields=id`,
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
        resp.on("close", () => res(JSON.parse(data)));
        resp.on("error", (err) => rej(err));
      }
    );
    request.end();
  });
};
