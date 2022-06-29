import { Request, Response } from "express";
import AppError from "../utils/app-error";
import * as AWS from "aws-sdk";

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

export const memberAdded = async (req: Request, res: Response) => {
  try {
    const user = req.body as User;

    const { id, email, membership, profile, created_at } = user;
    const params: AWS.DynamoDB.PutItemInput = {
      Item: {
        id,
        email,
        // profile: {
        //   usernames: [profile["twitter-handle"]],
        // },
        // membership: {
        //   M: {
        //     id: {
        //       S: membership.id,
        //     },
        //     staus: {
        //       S: membership.status,
        //     },
        //     subscribed_to: {
        //       S: membership.subscribed_to,
        //     },
        //   },
        // },
        // stats: {
        //   M: {
        //     like: {
        //       M: {
        //         count: { N: "0" },
        //         last_posted: { S: "" },
        //       },
        //     },
        //     retweet: {
        //       M: {
        //         count: { N: "0" },
        //         last_posted: { S: "" },
        //       },
        //     },
        //     reply: {
        //       M: {
        //         count: { N: "0" },
        //         last_posted: { S: "" },
        //       },
        //     },
        //   },
        // },
        // created_at: { S: created_at },
      },
      TableName: "Users",
    };
    // const params: AWS.DynamoDB.PutItemInput = {
    //   Item: {
    //     id: { S: id },
    //     email: { S: email },
    //     profile: {
    //       M: {
    //         usernames: {
    //           L: [{ S: profile["twitter-handle"] }],
    //         },
    //       },
    //     },
    //     membership: {
    //       M: {
    //         id: {
    //           S: membership.id,
    //         },
    //         staus: {
    //           S: membership.status,
    //         },
    //         subscribed_to: {
    //           S: membership.subscribed_to,
    //         },
    //       },
    //     },
    //     stats: {
    //       M: {
    //         like: {
    //           M: {
    //             count: { N: "0" },
    //             last_posted: { S: "" },
    //           },
    //         },
    //         retweet: {
    //           M: {
    //             count: { N: "0" },
    //             last_posted: { S: "" },
    //           },
    //         },
    //         reply: {
    //           M: {
    //             count: { N: "0" },
    //             last_posted: { S: "" },
    //           },
    //         },
    //       },
    //     },
    //     created_at: { S: created_at },
    //   },
    //   TableName: "Users",
    // };

    dynamodb.putItem(params, (err, data) => {
      if (err) throw new AppError(err.message, 503);
      res.json({
        status: true,
        message: "User Added to DB",
      });
    });
  } catch (error) {
    throw new AppError(error.message, 500);
  }
};

export const memberDeleted = async (req: Request, res: Response) => {
  type UserDeleted = {
    id: string;
    email: string;
  };

  try {
    const data = req.body as UserDeleted;

    const { email } = data;

    const params: AWS.DynamoDB.GetItemInput | AWS.DynamoDB.DeleteItemInput = {
      Key: {
        email: { S: email },
      },
      TableName: "Users",
    };

    dynamodb.getItem(params, (err, data) => {
      if (err) throw new AppError(err.message, 503);
      dynamodb.deleteItem(params, (err, data) => {
        if (err) throw new AppError(err.message, 503);
        res.json({
          status: true,
          message: "User Deleted from DB",
        });
      });
    });
  } catch (error) {
    throw new AppError(error.message, 500);
  }
};
