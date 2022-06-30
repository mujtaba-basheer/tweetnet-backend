import { Request, Response } from "express";
import { getAuthorizationParamsString, createToken } from "../utils/auth";
import AppError from "../utils/app-error";
import catchAsync from "../utils/catch-async";

export const authorizationUrl = catchAsync(
  async (req: Request, res: Response) => {
    const baseUrl = "https://twitter.com/i/oauth2/authorize";
    const scope = [
      "tweet.read",
      "follows.read",
      "users.read",
      "like.read",
      "like.write",
      "tweet.write",
    ];
    try {
      const qs = await getAuthorizationParamsString(scope);

      res.json({
        status: true,
        data: baseUrl + "?" + qs,
      });
    } catch (error) {
      return new AppError(error.message, 503);
    }
  }
);

export const getToken = catchAsync(async (req: Request, res: Response) => {
  try {
    const code = req.body.code;
    const token = await createToken(code);

    // TODO: Get username from token, and check if it's valid

    res.json({ status: true, data: { token } });
  } catch (error) {
    return new AppError(error.message, 501);
  }
});
