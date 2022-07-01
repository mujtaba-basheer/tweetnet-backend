import { NextFunction, Request, Response } from "express";
import {
  getAuthorizationParamsString,
  createToken,
  regenerateToken,
  revokeToken,
  decrypt,
} from "../utils/auth";
import AppError from "../utils/app-error";
import catchAsync from "../utils/catch-async";
import api_scope from "../data/scope";
import { config } from "dotenv";
import * as AWS from "aws-sdk";
import { getUserDetails } from "../utils/user";
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

export const authorizationUrl = catchAsync(
  async (req: Request, res: Response) => {
    const baseUrl = "https://twitter.com/i/oauth2/authorize";
    try {
      const qs = await getAuthorizationParamsString(api_scope);

      res.json({
        status: true,
        data: baseUrl + "?" + qs,
      });
    } catch (error) {
      return new AppError(error.message, 503);
    }
  }
);

export const getFreshToken = catchAsync(
  async (req: Request & { user: any }, res: Response, next: NextFunction) => {
    try {
      type ReqBody = {
        token: {
          refresh_token: string;
        };
      };
      const {
        token: { refresh_token },
      } = req.body as ReqBody;
      const mid = req.user.mid;

      const new_access_token = await regenerateToken(refresh_token);

      res.json({
        status: true,
        data: {
          ...new_access_token,
          access_token: `${mid}.${new_access_token.access_token}`,
        },
      });
    } catch (error) {
      return next(new AppError(error.message, error.statusCode || 501));
    }
  }
);

export const getToken = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      type User = {
        id: { S: string };
        tid?: { S: string };
        profile: {
          M: {
            usernames: {
              L: { S: string }[];
            };
          };
        };
      };

      const { code, mid } = req.body;
      const token = await createToken(code);
      const t_user = await getUserDetails(decrypt(token.access_token));

      // getting user from db
      const getUserParams: AWS.DynamoDB.GetItemInput = {
        Key: {
          id: { S: mid },
        },
        TableName: "Users",
      };

      dynamodb.getItem(getUserParams, async (err, data) => {
        if (err) return next(new AppError(err.message, 503));
        const user = data.Item as User;

        if (user) {
          const {
            profile: {
              M: { usernames },
            },
          } = user;

          // checking for valid usernames
          const current_username = t_user.data.username;
          if (usernames.L.map((x) => x.S).includes(current_username)) {
            res.json({
              status: true,
              data: {
                ...token,
                access_token: `${mid}.${token.access_token}`,
              },
            });
          } else return next(new AppError("Twitter handle not found", 404));
        } else return next(new AppError("User not found", 404));
      });
    } catch (error) {
      return next(new AppError(error.message, 501));
    }
  }
);

export const logout = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization;
      await revokeToken(token);

      res.json({
        status: true,
        message: "Access token revoked",
      });
    } catch (error) {
      return next(new AppError(error.message, 501));
    }
  }
);
