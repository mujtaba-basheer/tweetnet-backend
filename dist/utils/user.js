"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkTweetLike = exports.getUserDetails = void 0;
const https = require("https");
const app_error_1 = require("./app-error");
const getUserDetails = (token) => {
    return new Promise((res, rej) => {
        const request = https.request("https://api.twitter.com/2/users/me?user.fields=profile_image_url,name,username", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }, (resp) => {
            let data = "";
            resp.on("data", (chunk) => {
                data += chunk.toString();
            });
            resp.on("close", () => {
                const user = JSON.parse(data);
                if (resp.statusCode === 200)
                    res(user);
                else
                    rej(new app_error_1.default(user.title, resp.statusCode));
            });
            resp.on("error", (err) => rej(err));
        });
        request.end();
    });
};
exports.getUserDetails = getUserDetails;
const checkTweetLike = (userId, tweetId, token) => {
    return new Promise((res, rej) => {
        const request = https.request(`https://api.twitter.com/2/tweets/${tweetId}/liking_users?user.fields=id`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }, (resp) => {
            let data = "";
            resp.on("data", (chunk) => {
                data += chunk.toString();
            });
            resp.on("close", () => res(JSON.parse(data)));
            resp.on("error", (err) => rej(err));
        });
        request.end();
    });
};
exports.checkTweetLike = checkTweetLike;
