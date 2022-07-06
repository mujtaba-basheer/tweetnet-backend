"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memberDeleted = exports.memberAdded = void 0;
const app_error_1 = require("../utils/app-error");
const dotenv_1 = require("dotenv");
const AWS = require("aws-sdk");
(0, dotenv_1.config)();
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
const memberAdded = async (req, res, next) => {
    try {
        const user = req.body;
        console.log(JSON.stringify(user));
        const { id, email, membership, profile, created_at } = user;
        const last_posted = new Date().toISOString();
        const params = {
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
            if (err)
                return next(new app_error_1.default(err.message, 503));
            res.json({
                status: true,
                message: "User Added to DB",
            });
        });
    }
    catch (error) {
        throw new app_error_1.default(error.message, 500);
    }
};
exports.memberAdded = memberAdded;
const memberDeleted = async (req, res, next) => {
    try {
        const data = req.body;
        const { id } = data;
        const params = {
            Key: {
                id: { S: id },
            },
            TableName: "Users",
        };
        dynamodb.getItem(params, (err, data) => {
            if (err)
                return next(new app_error_1.default(err.message, 503));
            dynamodb.deleteItem(params, (err, data) => {
                if (err)
                    return next(new app_error_1.default(err.message, 503));
                res.json({
                    status: true,
                    message: "User Deleted from DB",
                });
            });
        });
    }
    catch (error) {
        return next(new app_error_1.default(error.message, 500));
    }
};
exports.memberDeleted = memberDeleted;
