"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.getToken = exports.getFreshToken = exports.authorizationUrl = void 0;
const auth_1 = require("../utils/auth");
const app_error_1 = require("../utils/app-error");
const catch_async_1 = require("../utils/catch-async");
const scope_1 = require("../data/scope");
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
    endpoint: "dynamodb.us-east-1.amazonaws.com",
    credentials,
    region: "us-east-1",
});
exports.authorizationUrl = (0, catch_async_1.default)(async (req, res) => {
    const baseUrl = "https://twitter.com/i/oauth2/authorize";
    try {
        const qs = await (0, auth_1.getAuthorizationParamsString)(scope_1.default);
        res.json({
            status: true,
            data: baseUrl + "?" + qs,
        });
    }
    catch (error) {
        return new app_error_1.default(error.message, 503);
    }
});
exports.getFreshToken = (0, catch_async_1.default)(async (req, res, next) => {
    try {
        const { token: { refresh_token }, } = req.body;
        const mid = req.user.data.mid;
        const new_access_token = await (0, auth_1.regenerateToken)(refresh_token);
        res.json({
            status: true,
            data: Object.assign(Object.assign({}, new_access_token), { access_token: `${mid}.${new_access_token.access_token}` }),
        });
    }
    catch (error) {
        return next(new app_error_1.default(error.message, error.statusCode || 501));
    }
});
exports.getToken = (0, catch_async_1.default)(async (req, res, next) => {
    try {
        const { code, state, mid } = req.body;
        const token = await (0, auth_1.createToken)(code, state);
        const t_user = await (0, user_1.getUserDetails)((0, auth_1.decrypt)(token.access_token));
        // getting user from db
        const getUserParams = {
            Key: {
                id: { S: mid },
            },
            TableName: "Users",
        };
        dynamodb.getItem(getUserParams, async (err, data) => {
            if (err)
                return next(new app_error_1.default(err.message, 503));
            const user = data.Item;
            if (user) {
                const { profile: { M: { usernames }, }, } = user;
                // checking for valid usernames
                const current_username = t_user.data.username;
                if (usernames.L.map((x) => x.S).includes(current_username)) {
                    res.json({
                        status: true,
                        data: Object.assign(Object.assign({}, token), { access_token: `${mid}.${token.access_token}` }),
                    });
                }
                else
                    return next(new app_error_1.default("Twitter handle not found", 404));
            }
            else
                return next(new app_error_1.default("User not found", 404));
        });
    }
    catch (error) {
        return next(new app_error_1.default(error.message, 501));
    }
});
exports.logout = (0, catch_async_1.default)(async (req, res, next) => {
    try {
        const token = req.headers.authorization;
        await (0, auth_1.revokeToken)(token);
        res.json({
            status: true,
            message: "Access token revoked",
        });
    }
    catch (error) {
        return next(new app_error_1.default(error.message, 501));
    }
});
