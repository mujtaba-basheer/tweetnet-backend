import { NextFunction, Request, Response } from "express";
import { getAuthorizationParamsString, createToken } from "../utils/auth";
import AppError from "../utils/app-error";
import catchAsync from "../utils/catch-async";
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

export const getToken = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      type User = {
        id: { S: string };
        mid?: { S: string };
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
      const t_user = await getUserDetails(token.access_token);

      // function to update mid and chang id
      const updateUserId: () => Promise<null> = () => {
        return new Promise((resolve, rej) => {
          const updateUserParams: AWS.DynamoDB.UpdateItemInput = {
            Key: {
              id: { S: mid },
            },
            UpdateExpression: `SET mid=:mid, id=:id`,
            ExpressionAttributeValues: {
              ":mid": { S: mid },
              ":id": { S: t_user.data.id },
            },
            TableName: "Users",
          };
          dynamodb.updateItem(updateUserParams, (err) => {
            if (err) rej(new Error(err.message));
            else resolve(null);
          });
        });
      };

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

          // swapping id and mid if required
          try {
            if (!user.mid) {
              await updateUserId();
            }

            // checking for valid usernames
            const current_username = t_user.data.username;
            if (usernames.L.map((x) => x.S).includes(current_username)) {
              res.json({
                status: true,
                data: token,
                new: "yes",
              });
            } else return next(new AppError("Twitter handle not found", 404));
          } catch (error) {
            return next(new AppError(error.message, 503));
          }
        } else return next(new AppError("User not found", 404));
      });
    } catch (error) {
      return next(new AppError(error.message, 501));
    }
  }
);
