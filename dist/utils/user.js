"use strict";
exports.__esModule = true;
exports.checkTweetLike = exports.getUserDetails = void 0;
var https = require("https");
var app_error_1 = require("./app-error");
var getUserDetails = function (token) {
    return new Promise(function (res, rej) {
        var request = https.request("https://api.twitter.com/2/users/me", {
            method: "GET",
            headers: {
                Authorization: "Bearer ".concat(token)
            }
        }, function (resp) {
            var data = "";
            resp.on("data", function (chunk) {
                data += chunk.toString();
            });
            resp.on("close", function () {
                var user = JSON.parse(data);
                if (resp.statusCode === 200)
                    res(user);
                else
                    rej(new app_error_1["default"](user.title, resp.statusCode));
            });
            resp.on("error", function (err) { return rej(err); });
        });
        request.end();
    });
};
exports.getUserDetails = getUserDetails;
var checkTweetLike = function (userId, tweetId, token) {
    return new Promise(function (res, rej) {
        var request = https.request("https://api.twitter.com/2/tweets/".concat(tweetId, "/liking_users?user.fields=id"), {
            method: "GET",
            headers: {
                Authorization: "Bearer ".concat(token)
            }
        }, function (resp) {
            var data = "";
            resp.on("data", function (chunk) {
                data += chunk.toString();
            });
            resp.on("close", function () { return res(JSON.parse(data)); });
            resp.on("error", function (err) { return rej(err); });
        });
        request.end();
    });
};
exports.checkTweetLike = checkTweetLike;
