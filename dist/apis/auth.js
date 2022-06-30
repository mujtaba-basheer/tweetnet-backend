"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsers = exports.getToken = exports.authorizationUrl = void 0;
const auth_1 = require("../utils/auth");
const app_error_1 = require("../utils/app-error");
const catch_async_1 = require("../utils/catch-async");
const dotenv_1 = require("dotenv");
const AWS = require("aws-sdk");
const user_1 = require("../utils/user");
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
exports.authorizationUrl = (0, catch_async_1.default)(async (req, res) => {
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
        const qs = await (0, auth_1.getAuthorizationParamsString)(scope);
        res.json({
            status: true,
            data: baseUrl + "?" + qs,
        });
    }
    catch (error) {
        return new app_error_1.default(error.message, 503);
    }
});
exports.getToken = (0, catch_async_1.default)(async (req, res, next) => {
    try {
        const { code, mid } = req.body;
        const token = await (0, auth_1.createToken)(code);
        // TODO: Get username from token, and check if it's valid
        // getting user from db
        const getUserParams = {
            Key: mid,
            TableName: "Users",
        };
        dynamodb.getItem(getUserParams, (err, data) => {
            if (err)
                return next(new app_error_1.default(err.message, 503));
            const user = data.Item;
        });
        res.json({ status: true, data: token });
    }
    catch (error) {
        return new app_error_1.default(error.message, 501);
    }
});
exports.getUsers = (0, catch_async_1.default)(async (req, res, next) => {
    try {
        const { code, mid } = req.body;
        const token = await (0, auth_1.createToken)(code);
        const t_user = await (0, user_1.getUserDetails)(token.access_token);
        // getting user from db
        const getUserParams = {
            Key: mid,
            TableName: "Users",
        };
        dynamodb.getItem(getUserParams, async (err, data) => {
            if (err)
                return next(new app_error_1.default(err.message, 503));
            const user = data.Item;
            if (user) {
                const { id, profile: { usernames }, } = user;
                // swapping id and mid if required
                if (!user.mid) {
                    const updateUserParams = {
                        Key: mid,
                        UpdateExpression: `SET mid=:mid, id=:id`,
                        ExpressionAttributeValues: {
                            ":mid": { S: mid },
                            ":id": { S: t_user.data.id },
                        },
                        TableName: "Users",
                    };
                    dynamodb.updateItem(updateUserParams, (err) => {
                        if (err)
                            return next(new app_error_1.default("Error Updating details", 501));
                    });
                }
                // checking for valid usernames
                const current_username = t_user.data.username;
                if (usernames.includes(current_username)) {
                    res.json({
                        status: true,
                        data: token,
                    });
                }
                else
                    return next(new app_error_1.default("Twitter handle not found", 404));
            }
            else
                return next(new app_error_1.default("User not found", 404));
        });
        res.json({ status: true, data: token });
    }
    catch (error) {
        return new app_error_1.default(error.message, 501);
    }
});
