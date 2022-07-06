import { NextFunction, Request, Response } from "express";
import AppError from "../utils/app-error";
import { config } from "dotenv";
import * as AWS from "aws-sdk";
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

type User = {
  email: string;
  id: string;
  name: string;
  profile: {
    "twitter-handle": string;
    name: string;
  };
  membership: {
    id: string;
    status: string;
    subscribed_to: string;
  };
  username: string[];
  stats: {
    like: Stat;
    retweet: Stat;
    reply: Stat;
  };
  created_at: string;
};

type Stat = {
  count: number;
  last_posted: DateConstructor;
};

export const memberAdded = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.body as User;
    console.log(JSON.stringify(user));

    const { id, email, membership, profile, created_at } = user;
    const last_posted = new Date().toISOString();
    const params: AWS.DynamoDB.PutItemInput = {
      Item: {
        id: { S: id },
        email: { S: email },
        profile: {
          M: {
            usernames: {
              L: [{ S: profile["twitter-handle"].substring(1) }],
            },
          },
        },
        membership: {
          M: {
            id: {
              S: membership.id,
            },
            staus: {
              S: membership.status,
            },
            subscribed_to: {
              S: membership.subscribed_to,
            },
          },
        },
        stats: {
          M: {
            like: {
              M: {
                count: { N: "0" },
                last_posted: { S: last_posted },
              },
            },
            retweet: {
              M: {
                count: { N: "0" },
                last_posted: { S: last_posted },
              },
            },
            reply: {
              M: {
                count: { N: "0" },
                last_posted: { S: last_posted },
              },
            },
          },
        },
        created_at: { S: created_at },
      },
      TableName: "Users",
    };

    dynamodb.putItem(params, (err, data) => {
      if (err) return next(new AppError(err.message, 503));
      res.json({
        status: true,
        message: "User Added to DB",
      });
    });
  } catch (error) {
    throw new AppError(error.message, 500);
  }
};

export const memberDeleted = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  type UserDeleted = {
    id: string;
    email: string;
  };

  try {
    const data = req.body as UserDeleted;

    const { id } = data;

    const params: AWS.DynamoDB.GetItemInput | AWS.DynamoDB.DeleteItemInput = {
      Key: {
        id: { S: id },
      },
      TableName: "Users",
    };

    dynamodb.getItem(params, (err, data) => {
      if (err) return next(new AppError(err.message, 503));
      dynamodb.deleteItem(params, (err, data) => {
        if (err) return next(new AppError(err.message, 503));
        res.json({
          status: true,
          message: "User Deleted from DB",
        });
      });
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
};
