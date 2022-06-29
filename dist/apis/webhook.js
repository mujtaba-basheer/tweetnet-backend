"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.memberDeleted = exports.memberAdded = void 0;
var app_error_1 = require("../utils/app-error");
var AWS = require("aws-sdk");
var credentials = new AWS.Credentials({
    accessKeyId: process.env.DYNAMODB_ACCESS_KEY_ID,
    secretAccessKey: process.env.DYNAMODB_ACCESS_KEY_SECRET
});
var dynamodb = new AWS.DynamoDB({
    apiVersion: "2012-08-10",
    endpoint: "dynamodb.ap-south-1.amazonaws.com",
    credentials: credentials,
    region: "ap-south-1"
});
var memberAdded = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, id, email, membership, profile, created_at, params;
    return __generator(this, function (_a) {
        try {
            user = req.body;
            id = user.id, email = user.email, membership = user.membership, profile = user.profile, created_at = user.created_at;
            params = {
                Item: {
                    id: id,
                    email: email
                },
                TableName: "Users"
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
            dynamodb.putItem(params, function (err, data) {
                if (err)
                    throw new app_error_1["default"](err.message, 503);
                res.json({
                    status: true,
                    message: "User Added to DB"
                });
            });
        }
        catch (error) {
            throw new app_error_1["default"](error.message, 500);
        }
        return [2 /*return*/];
    });
}); };
exports.memberAdded = memberAdded;
var memberDeleted = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var data, email, params_1;
    return __generator(this, function (_a) {
        try {
            data = req.body;
            email = data.email;
            params_1 = {
                Key: {
                    email: { S: email }
                },
                TableName: "Users"
            };
            dynamodb.getItem(params_1, function (err, data) {
                if (err)
                    throw new app_error_1["default"](err.message, 503);
                dynamodb.deleteItem(params_1, function (err, data) {
                    if (err)
                        throw new app_error_1["default"](err.message, 503);
                    res.json({
                        status: true,
                        message: "User Deleted from DB"
                    });
                });
            });
        }
        catch (error) {
            throw new app_error_1["default"](error.message, 500);
        }
        return [2 /*return*/];
    });
}); };
exports.memberDeleted = memberDeleted;
