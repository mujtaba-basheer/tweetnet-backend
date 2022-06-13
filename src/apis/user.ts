import { Request, Response } from "express";
import * as https from "https";
import { getUserDetails } from "../utils/user";

export const getFollows = async (req: Request, res: Response) => {
  const token = req.headers.Authorization as string;
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
        res.json(JSON.parse(data));
      });
    }
  );
  request.end();
};
