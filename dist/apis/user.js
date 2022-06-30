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
exports.replyToTweet = exports.retweetTweet = exports.likeTweet = exports.getTweets = exports.forwardTweets = exports.getMyTweets = exports.getFollows = void 0;
var dotenv_1 = require("dotenv");
var https = require("https");
var app_error_1 = require("../utils/app-error");
var catch_async_1 = require("../utils/catch-async");
var user_1 = require("../utils/user");
var AWS = require("aws-sdk");
var subscription_1 = require("../data/subscription");
(0, dotenv_1.config)();
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
var getFollows = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var token, user_id, request;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                token = req.headers.authorization;
                return [4 /*yield*/, (0, user_1.getUserDetails)(token)];
            case 1:
                user_id = (_a.sent()).data.id;
                request = https.request("https://api.twitter.com/2/users/".concat(user_id, "/followers?max_results=10"), {
                    method: "GET",
                    headers: {
                        Authorization: "Bearer ".concat(token)
                    }
                }, function (resp) {
                    var data = "";
                    resp.on("data", function (chunk) {
                        data += chunk.toString();
                    });
                    resp.on("error", function (err) {
                        console.error(err);
                    });
                    resp.on("end", function () {
                        res.json({
                            status: true,
                            data: JSON.parse(data)
                        });
                    });
                });
                request.end();
                return [2 /*return*/];
        }
    });
}); };
exports.getFollows = getFollows;
exports.getMyTweets = (0, catch_async_1["default"])(function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var token, user_id, request;
    return __generator(this, function (_a) {
        token = req.headers.authorization;
        user_id = req.user.data.id;
        request = https.request("https://api.twitter.com/2/users/".concat(user_id, "/tweets?max_results=100&exclude=replies,retweets&expansions=author_id,attachments.media_keys&media.fields=media_key,type,url,preview_image_url&user.fields=profile_image_url"), {
            method: "GET",
            headers: {
                Authorization: "Bearer ".concat(token)
            }
        }, function (resp) {
            var data = "";
            resp.on("data", function (chunk) {
                data += chunk.toString();
            });
            resp.on("error", function (err) {
                return next(new app_error_1["default"](err.message, 503));
            });
            resp.on("end", function () {
                var tweeetsResp = JSON.parse(data);
                if (resp.statusCode !== 200)
                    return next(new app_error_1["default"](tweeetsResp.title, resp.statusCode));
                var tweets = tweeetsResp.data, includes = tweeetsResp.includes, meta = tweeetsResp.meta;
                var _loop_1 = function (tweet) {
                    var author_id = tweet.author_id;
                    tweet.author_details = includes.users.find(function (_a) {
                        var id = _a.id;
                        return id === author_id;
                    });
                    if (tweet.attachments && tweet.attachments.media_keys.length > 0) {
                        var _loop_2 = function (media_key) {
                            var media = includes.media.find(function (x) { return x.media_key === media_key; });
                            var url = void 0;
                            if (media) {
                                if (media.type === "photo")
                                    url = media.url;
                                else
                                    url = media.preview_image_url;
                                if (!tweet.attachement_urls) {
                                    tweet.attachement_urls = [url];
                                }
                                else
                                    tweet.attachement_urls.push(url);
                            }
                        };
                        for (var _b = 0, _c = tweet.attachments.media_keys; _b < _c.length; _b++) {
                            var media_key = _c[_b];
                            _loop_2(media_key);
                        }
                    }
                };
                for (var _i = 0, tweets_1 = tweets; _i < tweets_1.length; _i++) {
                    var tweet = tweets_1[_i];
                    _loop_1(tweet);
                }
                for (var _a = 0, tweets_2 = tweets; _a < tweets_2.length; _a++) {
                    var tweet = tweets_2[_a];
                    delete tweet.attachments;
                }
                res.json({
                    status: true,
                    data: { data: tweeetsResp.data, meta: meta }
                });
            });
        });
        request.end();
        return [2 /*return*/];
    });
}); });
exports.forwardTweets = (0, catch_async_1["default"])(function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, ids_1, task_1, user_id_1, getUserParams;
    return __generator(this, function (_b) {
        try {
            _a = req.body, ids_1 = _a.ids, task_1 = _a.task;
            if (["like", "retweet", "reply"].includes(task_1)) {
                user_id_1 = req.user.data.id;
                getUserParams = {
                    Key: { id: { S: user_id_1 } },
                    TableName: "Users"
                };
                dynamodb.getItem(getUserParams, function (err, data) {
                    if (err) {
                        console.log(err);
                        return next(new app_error_1["default"](err.message, 503));
                    }
                    console.log(data, user_id_1);
                    var user = data.Item;
                    var _a = user.stats[task_1], count = _a.count, last_posted = _a.last_posted;
                    var sid = user.membership.subscribed_to;
                    var n = ids_1.length;
                    var limit_o = subscription_1["default"].find(function (x) { return x.sid === sid; });
                    // checking daily limits
                    if (limit_o) {
                        var limit = limit_o.limit[task_1];
                        var created_at_1 = new Date();
                        var created_at_date = created_at_1.toISOString().substring(0, 10);
                        var last_posted_date = last_posted.substring(0, 10);
                        try {
                            if (last_posted_date < created_at_date) {
                                if (n <= limit) {
                                    count = n;
                                    last_posted = created_at_1.toISOString();
                                }
                                else
                                    throw new Error("Limit Exceeded");
                            }
                            else if (n + count <= limit) {
                                last_posted = created_at_1.toISOString();
                                count += n;
                            }
                            else
                                throw new Error("Limit Exceeded");
                            // adding tweets to DB
                            var putTweetsParams = {
                                RequestItems: {
                                    Tweets: ids_1.map(function (id) { return ({
                                        PutRequest: {
                                            Item: {
                                                id: { S: id },
                                                task: { S: task_1 },
                                                created_by: { S: user_id_1 },
                                                acted_by: { L: [] },
                                                created_at: { S: created_at_1.toISOString() }
                                            }
                                        }
                                    }); })
                                }
                            };
                            dynamodb.batchWriteItem(putTweetsParams, function (err, data) {
                                if (err)
                                    return next(new app_error_1["default"](err.message, 503));
                                // updating user data in DB
                                var updateUserParams = {
                                    Key: { user_id: { S: user_id_1 } },
                                    UpdateExpression: "SET stats.".concat(task_1, ".count = :c, stats.").concat(task_1, ".last_posted = :l_p"),
                                    ExpressionAttributeValues: {
                                        ":c": {
                                            N: count + ""
                                        },
                                        ":l_p": {
                                            S: last_posted
                                        }
                                    },
                                    TableName: "Users"
                                };
                                dynamodb.updateItem(updateUserParams, function (err, data) {
                                    if (err)
                                        return next(new app_error_1["default"](err.message, 503));
                                    res.json({
                                        status: true,
                                        message: "Tweets forwarded successfully"
                                    });
                                });
                            });
                        }
                        catch (error) {
                            return next(new app_error_1["default"](error.message, 400));
                        }
                    }
                    else
                        return next(new app_error_1["default"]("Subscription not found", 404));
                });
            }
            else
                return [2 /*return*/, next(new app_error_1["default"]("Bad Request", 400))];
        }
        catch (error) {
            return [2 /*return*/, next(new app_error_1["default"](error.message, 501))];
        }
        return [2 /*return*/];
    });
}); });
var getTweets = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var token, user_id, request;
    return __generator(this, function (_a) {
        token = req.headers.authorization;
        user_id = req.params.id;
        request = https.request("https://api.twitter.com/2/users/".concat(user_id, "/tweets?expansions=author_id,attachments.media_keys&media.fields=media_key,type,url,preview_image_url&user.fields=profile_image_url"), {
            method: "GET",
            headers: {
                Authorization: "Bearer ".concat(token)
            }
        }, function (resp) {
            var data = "";
            resp.on("data", function (chunk) {
                data += chunk.toString();
            });
            resp.on("error", function (err) {
                console.error(err);
            });
            resp.on("end", function () {
                var tweeetsResp = JSON.parse(data);
                var tweets = tweeetsResp.data, includes = tweeetsResp.includes, meta = tweeetsResp.meta;
                var _loop_3 = function (tweet) {
                    var author_id = tweet.author_id;
                    tweet.author_details = includes.users.find(function (_a) {
                        var id = _a.id;
                        return id === author_id;
                    });
                    if (tweet.attachments && tweet.attachments.media_keys.length > 0) {
                        var _loop_4 = function (media_key) {
                            var media = includes.media.find(function (x) { return x.media_key === media_key; });
                            var url = void 0;
                            if (media) {
                                if (media.type === "photo")
                                    url = media.url;
                                else
                                    url = media.preview_image_url;
                                if (!tweet.attachement_urls) {
                                    tweet.attachement_urls = [url];
                                }
                                else
                                    tweet.attachement_urls.push(url);
                            }
                        };
                        for (var _b = 0, _c = tweet.attachments.media_keys; _b < _c.length; _b++) {
                            var media_key = _c[_b];
                            _loop_4(media_key);
                        }
                    }
                };
                for (var _i = 0, tweets_3 = tweets; _i < tweets_3.length; _i++) {
                    var tweet = tweets_3[_i];
                    _loop_3(tweet);
                }
                for (var _a = 0, tweets_4 = tweets; _a < tweets_4.length; _a++) {
                    var tweet = tweets_4[_a];
                    delete tweet.attachments;
                }
                res.json({
                    status: true,
                    data: { data: tweeetsResp.data, meta: meta }
                });
            });
        });
        request.end();
        return [2 /*return*/];
    });
}); };
exports.getTweets = getTweets;
var likeTweet = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var token, user_id, tweet_id, request;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                token = req.headers.authorization;
                return [4 /*yield*/, (0, user_1.getUserDetails)(token)];
            case 1:
                user_id = (_a.sent()).data.id;
                tweet_id = req.body.tweet_id;
                console.log({ body: req.body });
                request = https.request("https://api.twitter.com/2/users/".concat(user_id, "/likes"), {
                    method: "POST",
                    headers: {
                        Authorization: "Bearer ".concat(token),
                        "Content-Type": "application/json"
                    }
                }, function (resp) {
                    var data = "";
                    resp.on("data", function (chunk) {
                        data += chunk.toString();
                    });
                    resp.on("error", function (err) {
                        console.error(err);
                    });
                    resp.on("end", function () {
                        console.log(JSON.parse(data));
                        res.json({
                            status: true,
                            data: JSON.parse(data)
                        });
                    });
                });
                request.write(JSON.stringify({ tweet_id: tweet_id }));
                request.end();
                return [2 /*return*/];
        }
    });
}); };
exports.likeTweet = likeTweet;
var retweetTweet = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var token, user_id, tweet_id, request;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                token = req.headers.authorization;
                return [4 /*yield*/, (0, user_1.getUserDetails)(token)];
            case 1:
                user_id = (_a.sent()).data.id;
                tweet_id = req.body.tweet_id;
                request = https.request("https://api.twitter.com/2/users/".concat(user_id, "/retweets"), {
                    method: "POST",
                    headers: {
                        Authorization: "Bearer ".concat(token),
                        "Content-Type": "application/json"
                    }
                }, function (resp) {
                    var data = "";
                    resp.on("data", function (chunk) {
                        data += chunk.toString();
                    });
                    resp.on("error", function (err) {
                        console.error(err);
                    });
                    resp.on("end", function () {
                        res.json({
                            status: true,
                            data: JSON.parse(data)
                        });
                    });
                });
                request.write(JSON.stringify({ tweet_id: tweet_id }));
                request.end();
                return [2 /*return*/];
        }
    });
}); };
exports.retweetTweet = retweetTweet;
var replyToTweet = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var token, _a, tweet_id, text, body, request;
    return __generator(this, function (_b) {
        token = req.headers.authorization;
        _a = req.body, tweet_id = _a.tweet_id, text = _a.text;
        body = {
            text: text,
            reply: {
                in_reply_to_tweet_id: tweet_id
            }
        };
        request = https.request("https://api.twitter.com/2/tweets", {
            method: "POST",
            headers: {
                Authorization: "Bearer ".concat(token),
                "Content-Type": "application/json"
            }
        }, function (resp) {
            var data = "";
            resp.on("data", function (chunk) {
                data += chunk.toString();
            });
            resp.on("error", function (err) {
                console.error(err);
            });
            resp.on("end", function () {
                res.json({
                    status: true,
                    data: JSON.parse(data)
                });
            });
        });
        request.write(JSON.stringify(body));
        request.end();
        return [2 /*return*/];
    });
}); };
exports.replyToTweet = replyToTweet;
