import { Request, Response } from "express";
import * as AWS from "aws-sdk";
const credentials = new AWS.Credentials({
  accessKeyId: process.env.DYNAMODB_ACCESS_KEY_ID,
  secretAccessKey: process.env.DYNAMODB_ACCESS_KEY_SECRET,
});
const dynamodb = new AWS.DynamoDB({
  apiVersion: "2012-08-10",
  endpoint: "dynamodb.ap-south-1.amazonaws.com",
  credentials,
});

export const testWebhook = async (req: Request, res: Response) => {
  const user = req.body;
  console.log(JSON.stringify(user));

  res.json(req.body);
};
