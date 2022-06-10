import { Request, Response } from "express";
import * as https from "https";
import {
  getAuthorization,
  getAuthorizationParamsString,
  createToken,
} from "../utils/auth";

export const requestToken = (req: Request, res: Response) => {
  const httpMethod = "POST",
    baseUrl = "https://api.twitter.com/oauth/request_token",
    reqParams = {
      oauth_callback: `${process.env.STAGING_LINK}/api/callback`,
    };
  console.log(getAuthorization(httpMethod, baseUrl, {}));

  const request = https.request(
    `${baseUrl}?${new URLSearchParams(reqParams).toString()}`,
    {
      method: httpMethod,
      headers: {
        Authorization: getAuthorization(httpMethod, baseUrl, {}),
      },
    },
    (resp) => {
      resp.on("data", (chunk) => {
        console.log(JSON.stringify(chunk.toString()));
      });
      resp.on("error", (err) => {
        console.error(err);
      });
      resp.on("end", () => {
        console.log("Data fetched!");
      });
    }
  );
  request.end();
};

export const authorizationUrl = async (req: Request, res: Response) => {
  const baseUrl = "https://twitter.com/i/oauth2/authorize";
  const scope = ["tweet.read", "follows.read", "follows.write"];
  const qs = await getAuthorizationParamsString(scope);

  res.json({
    status: true,
    data: baseUrl + "?" + qs,
  });
};

export const callback = async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const token = await createToken(code);
  res.json({ status: true, data: { token } });
};
