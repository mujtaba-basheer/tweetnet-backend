"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.membershipCanceled = exports.membershipChanged = exports.memberUpdated = exports.memberDeleted = exports.memberAdded = void 0;
const app_error_1 = require("../utils/app-error");
const subscription_1 = require("../data/subscription");
const dotenv_1 = require("dotenv");
const AWS = require("aws-sdk");
(0, dotenv_1.config)();
const credentials = new AWS.Credentials({
    accessKeyId: process.env.DYNAMODB_ACCESS_KEY_ID,
    secretAccessKey: process.env.DYNAMODB_ACCESS_KEY_SECRET,
});
const dynamodb = new AWS.DynamoDB({
    apiVersion: "2012-08-10",
    endpoint: "dynamodb.us-east-1.amazonaws.com",
    credentials,
    region: "us-east-1",
});
const memberAdded = async (req, res, next) => {
    try {
        const user = req.body;
        const { id, email, membership, profile, created_at } = user;
        const last_posted = new Date().toISOString();
        const usernames = [profile["twitter-handle"]];
        const sub_details = subscription_1.default.find((x) => x.sid === membership.subscribed_to);
        if (sub_details && sub_details.usernames === 3) {
            usernames.push(profile["twitter-handle-second"]);
            usernames.push(profile["twitter-handle-third"]);
        }
        const params = {
            Item: {
                id: { S: id },
                email: { S: email },
                profile: {
                    M: {
                        usernames: {
                            L: usernames.map((u) => ({ S: u.replace("@", "") })),
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
                        self: {
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
                        others: {
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
const memberUpdated = async (req, res, next) => {
    try {
        const user = req.body;
        const { id, profile } = user;
        const getUserParams = {
            Key: {
                id: { S: id },
            },
            TableName: "Users",
        };
        dynamodb.getItem(getUserParams, (err, data) => {
            if (err)
                return next(new app_error_1.default(err.message, 503));
            const userRecord = data.Item;
            const { membership } = userRecord;
            const usernames = [profile["twitter-handle"]];
            const sub_details = subscription_1.default.find((x) => x.sid === membership.M.subscribed_to.S);
            if (sub_details && sub_details.usernames === 3) {
                usernames.push(profile["twitter-handle-second"]);
                usernames.push(profile["twitter-handle-third"]);
            }
            const updateUserParams = {
                Key: {
                    id: { S: id },
                },
                UpdateExpression: "SET #P = :p",
                ExpressionAttributeNames: {
                    "#P": "profile",
                },
                ExpressionAttributeValues: {
                    ":p": {
                        M: {
                            usernames: {
                                L: usernames.map((u) => ({ S: u.replace("@", "") })),
                            },
                        },
                    },
                },
                TableName: "Users",
            };
            dynamodb.updateItem(updateUserParams, (err, data) => {
                if (err) {
                    console.log(JSON.stringify(err));
                    return next(new app_error_1.default(err.message, 503));
                }
                res.json({
                    status: true,
                    message: "User updated",
                });
            });
        });
    }
    catch (error) {
        throw new app_error_1.default(error.message, 500);
    }
};
exports.memberUpdated = memberUpdated;
const membershipChanged = async (req, res, next) => {
    try {
        const user = req.body;
        const { member_id, new_membership } = user;
        const last_posted = new Date().toISOString();
        const updateUserParams = {
            Key: {
                id: { S: member_id },
            },
            UpdateExpression: "SET #M = :m, #S = :s",
            ExpressionAttributeNames: {
                "#M": "membership",
                "#S": "stats",
            },
            ExpressionAttributeValues: {
                ":m": {
                    M: {
                        id: { S: new_membership.id },
                        status: { S: new_membership.status },
                        subscribed_to: { S: new_membership.subscribed_to },
                    },
                },
                ":s": {
                    M: {
                        self: {
                            M: {
                                like: {
                                    M: {
                                        count: {
                                            N: "0",
                                        },
                                        last_posted: {
                                            S: last_posted,
                                        },
                                    },
                                },
                                reply: {
                                    M: {
                                        count: {
                                            N: "0",
                                        },
                                        last_posted: {
                                            S: last_posted,
                                        },
                                    },
                                },
                                retweet: {
                                    M: {
                                        count: {
                                            N: "0",
                                        },
                                        last_posted: {
                                            S: last_posted,
                                        },
                                    },
                                },
                            },
                        },
                        others: {
                            M: {
                                like: {
                                    M: {
                                        count: {
                                            N: "0",
                                        },
                                        last_posted: {
                                            S: last_posted,
                                        },
                                    },
                                },
                                reply: {
                                    M: {
                                        count: {
                                            N: "0",
                                        },
                                        last_posted: {
                                            S: last_posted,
                                        },
                                    },
                                },
                                retweet: {
                                    M: {
                                        count: {
                                            N: "0",
                                        },
                                        last_posted: {
                                            S: last_posted,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            TableName: "Users",
        };
        dynamodb.updateItem(updateUserParams, (err, data) => {
            if (err) {
                console.log(JSON.stringify(err));
                return next(new app_error_1.default(err.message, 503));
            }
            res.json({
                status: true,
                message: "User membership updated",
            });
        });
    }
    catch (error) {
        throw new app_error_1.default(error.message, 500);
    }
};
exports.membershipChanged = membershipChanged;
const membershipCanceled = async (req, res, next) => {
    try {
        const user = req.body;
        console.log(JSON.stringify(user));
        return res.json({ status: true });
        const { member_id, new_membership } = user;
        const last_posted = new Date().toISOString();
        const updateUserParams = {
            Key: {
                id: { S: member_id },
            },
            UpdateExpression: "SET #M = :m, #S = :s",
            ExpressionAttributeNames: {
                "#M": "membership",
                "#S": "stats",
            },
            ExpressionAttributeValues: {
                ":m": {
                    M: {
                        id: { S: new_membership.id },
                        status: { S: new_membership.status },
                        subscribed_to: { S: new_membership.subscribed_to },
                    },
                },
                ":s": {
                    M: {
                        self: {
                            M: {
                                like: {
                                    M: {
                                        count: {
                                            N: "0",
                                        },
                                        last_posted: {
                                            S: last_posted,
                                        },
                                    },
                                },
                                reply: {
                                    M: {
                                        count: {
                                            N: "0",
                                        },
                                        last_posted: {
                                            S: last_posted,
                                        },
                                    },
                                },
                                retweet: {
                                    M: {
                                        count: {
                                            N: "0",
                                        },
                                        last_posted: {
                                            S: last_posted,
                                        },
                                    },
                                },
                            },
                        },
                        others: {
                            M: {
                                like: {
                                    M: {
                                        count: {
                                            N: "0",
                                        },
                                        last_posted: {
                                            S: last_posted,
                                        },
                                    },
                                },
                                reply: {
                                    M: {
                                        count: {
                                            N: "0",
                                        },
                                        last_posted: {
                                            S: last_posted,
                                        },
                                    },
                                },
                                retweet: {
                                    M: {
                                        count: {
                                            N: "0",
                                        },
                                        last_posted: {
                                            S: last_posted,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            TableName: "Users",
        };
        dynamodb.updateItem(updateUserParams, (err, data) => {
            if (err) {
                console.log(JSON.stringify(err));
                return next(new app_error_1.default(err.message, 503));
            }
            res.json({
                status: true,
                message: "User membership updated",
            });
        });
    }
    catch (error) {
        throw new app_error_1.default(error.message, 500);
    }
};
exports.membershipCanceled = membershipCanceled;
