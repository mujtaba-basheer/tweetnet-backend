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
exports.retweetTweet = exports.likeTweet = exports.getTweets = exports.getFollows = void 0;
var https = require("https");
var user_1 = require("../utils/user");
var getFollows = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var token, user_id, request;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                token = req.headers.authorization;
                return [4 /*yield*/, (0, user_1.getUserDetails)(token)];
            case 1:
                user_id = (_a.sent()).data.id;
                console.log({ user_id: user_id });
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
                        console.log({ data: JSON.parse(data) });
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
var getTweets = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var token, user_id, request;
    return __generator(this, function (_a) {
        token = req.headers.authorization;
        user_id = req.params.id;
        request = https.request("https://api.twitter.com/2/users/".concat(user_id, "/tweets?max_results=10"), {
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
    });
}); };
exports.getTweets = getTweets;
var likeTweet = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var token, user_id, tweet_id, request;
    return __generator(this, function (_a) {
        token = req.headers.authorization;
        user_id = req.params.id;
        tweet_id = req.body.tweet_id;
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
                res.json({
                    status: true,
                    data: JSON.parse(data)
                });
            });
        });
        request.write(JSON.stringify({ tweet_id: tweet_id }));
        request.end();
        return [2 /*return*/];
    });
}); };
exports.likeTweet = likeTweet;
var retweetTweet = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var token, user_id, tweet_id, request;
    return __generator(this, function (_a) {
        token = req.headers.authorization;
        user_id = req.params.id;
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
    });
}); };
exports.retweetTweet = retweetTweet;
