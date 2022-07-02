"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replyToTweet = exports.retweetTweet = exports.likeTweet = exports.getTweets = exports.forwardTweets = exports.getMyTweets = exports.getFollows = void 0;
const dotenv_1 = require("dotenv");
const https = require("https");
const app_error_1 = require("../utils/app-error");
const catch_async_1 = require("../utils/catch-async");
const user_1 = require("../utils/user");
const AWS = require("aws-sdk");
const subscription_1 = require("../data/subscription");
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
const getFollows = async (req, res) => {
    const token = req.headers.authorization;
    const user_id = (await (0, user_1.getUserDetails)(token)).data.id;
    const request = https.request(`https://api.twitter.com/2/users/${user_id}/followers?max_results=10`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    }, (resp) => {
        let data = "";
        resp.on("data", (chunk) => {
            data += chunk.toString();
        });
        resp.on("error", (err) => {
            console.error(err);
        });
        resp.on("end", () => {
            res.json({
                status: true,
                data: JSON.parse(data),
            });
        });
    });
    request.end();
};
exports.getFollows = getFollows;
exports.getMyTweets = (0, catch_async_1.default)(async (req, res, next) => {
    const token = req.headers.authorization;
    const user_id = req.user.data.id;
    const request = https.request(`https://api.twitter.com/2/users/${user_id}/tweets?max_results=100&exclude=replies,retweets&expansions=author_id,attachments.media_keys&media.fields=media_key,type,url,preview_image_url&user.fields=profile_image_url`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    }, (resp) => {
        let data = "";
        resp.on("data", (chunk) => {
            data += chunk.toString();
        });
        resp.on("error", (err) => {
            return next(new app_error_1.default(err.message, 503));
        });
        resp.on("end", () => {
            const tweeetsResp = JSON.parse(data);
            if (resp.statusCode !== 200)
                return next(new app_error_1.default(tweeetsResp.title, resp.statusCode));
            const { data: tweets, includes, meta } = tweeetsResp;
            for (const tweet of tweets) {
                const { author_id } = tweet;
                tweet.author_details = includes.users.find(({ id }) => id === author_id);
                if (tweet.attachments && tweet.attachments.media_keys.length > 0) {
                    for (const media_key of tweet.attachments.media_keys) {
                        const media = includes.media.find((x) => x.media_key === media_key);
                        let url;
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
                    }
                }
            }
            for (const tweet of tweets) {
                delete tweet.attachments;
            }
            res.json({
                status: true,
                data: { data: tweeetsResp.data, meta },
            });
        });
    });
    request.end();
});
exports.forwardTweets = (0, catch_async_1.default)(async (req, res, next) => {
    try {
        const { ids, task } = req.body;
        if (["like", "retweet", "reply"].includes(task)) {
            const { mid } = req.user.data;
            // getting user object from DB
            const getUserParams = {
                Key: { id: { S: mid } },
                TableName: "Users",
            };
            dynamodb.getItem(getUserParams, (err, data) => {
                if (err || !data.Item) {
                    return next(new app_error_1.default(err.message, 503));
                }
                const user = data.Item;
                let { count: { N: count }, last_posted: { S: last_posted }, } = user.stats.M[task].M;
                let c = +count;
                const sid = user.membership.M.subscribed_to.S;
                const n = ids.length;
                const limit_o = subscription_1.default.find((x) => x.sid === sid);
                // checking daily limits
                if (limit_o) {
                    const limit = limit_o.limit[task];
                    const created_at = new Date();
                    const created_at_date = created_at.toISOString().substring(0, 10);
                    const last_posted_date = last_posted.substring(0, 10);
                    try {
                        if (last_posted_date < created_at_date) {
                            if (n <= limit) {
                                c = n;
                                last_posted = created_at.toISOString();
                            }
                            else
                                throw new Error("Limit Exceeded");
                        }
                        else if (n + c <= limit) {
                            last_posted = created_at.toISOString();
                            c += n;
                        }
                        else
                            throw new Error("Limit Exceeded");
                        // adding tweets to DB
                        const putTweetsParams = {
                            RequestItems: {
                                Tweets: ids.map((id) => ({
                                    PutRequest: {
                                        Item: {
                                            id: { S: id },
                                            task: { S: task },
                                            created_by: { S: mid },
                                            acted_by: { L: [] },
                                            created_at: { S: created_at.toISOString() },
                                        },
                                    },
                                })),
                            },
                        };
                        dynamodb.batchWriteItem(putTweetsParams, (err, data) => {
                            if (err)
                                return next(new app_error_1.default(err.message, 503));
                            // updating user data in DB
                            const updateUserParams = {
                                Key: { id: { S: mid } },
                                UpdateExpression: "SET #stats=:stats",
                                ExpressionAttributeNames: {
                                    "#stats": "stats",
                                },
                                ExpressionAttributeValues: {
                                    ":stats": {
                                        M: Object.assign(Object.assign({}, user.stats.M), { [task]: {
                                                M: {
                                                    count: { N: c + "" },
                                                    last_posted: { S: last_posted },
                                                },
                                            } }),
                                    },
                                },
                                TableName: "Users",
                            };
                            dynamodb.updateItem(updateUserParams, (err, data) => {
                                if (err)
                                    return next(new app_error_1.default(err.message, 503));
                                res.json({
                                    status: true,
                                    message: "Tweets forwarded successfully",
                                });
                            });
                        });
                    }
                    catch (error) {
                        return next(new app_error_1.default(error.message, 400));
                    }
                }
                else
                    return next(new app_error_1.default("Subscription not found", 404));
            });
        }
        else
            return next(new app_error_1.default("Bad Request", 400));
    }
    catch (error) {
        return next(new app_error_1.default(error.message, 501));
    }
});
const getTweets = async (req, res) => {
    const token = req.headers.authorization;
    const user_id = req.params.id;
    const request = https.request(`https://api.twitter.com/2/users/${user_id}/tweets?expansions=author_id,attachments.media_keys&media.fields=media_key,type,url,preview_image_url&user.fields=profile_image_url`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    }, (resp) => {
        let data = "";
        resp.on("data", (chunk) => {
            data += chunk.toString();
        });
        resp.on("error", (err) => {
            console.error(err);
        });
        resp.on("end", () => {
            const tweeetsResp = JSON.parse(data);
            const { data: tweets, includes, meta } = tweeetsResp;
            for (const tweet of tweets) {
                const { author_id } = tweet;
                tweet.author_details = includes.users.find(({ id }) => id === author_id);
                if (tweet.attachments && tweet.attachments.media_keys.length > 0) {
                    for (const media_key of tweet.attachments.media_keys) {
                        const media = includes.media.find((x) => x.media_key === media_key);
                        let url;
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
                    }
                }
            }
            for (const tweet of tweets) {
                delete tweet.attachments;
            }
            res.json({
                status: true,
                data: { data: tweeetsResp.data, meta },
            });
        });
    });
    request.end();
};
exports.getTweets = getTweets;
exports.likeTweet = (0, catch_async_1.default)(async (req, res, next) => {
    try {
        const token = req.headers.authorization;
        const { id: user_id, mid } = req.user.data;
        const tweet_id = req.params.tid;
        const request = https.request(`https://api.twitter.com/2/users/${user_id}/likes`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        }, (resp) => {
            let data = "";
            resp.on("data", (chunk) => {
                data += chunk.toString();
            });
            resp.on("error", (err) => {
                console.error(err);
            });
            resp.on("end", () => {
                data = JSON.parse(data);
                if (data.error) {
                    return next(new app_error_1.default(data.error, 503));
                }
                // adding task record to DB
                const updateTweetParams = {
                    Key: {
                        id: { S: tweet_id },
                    },
                    AttributeUpdates: {
                        acted_by: {
                            Action: "ADD",
                            Value: {
                                L: [{ S: mid }],
                            },
                        },
                    },
                    TableName: "Tweets",
                };
                dynamodb.updateItem(updateTweetParams, (err, data) => {
                    if (err)
                        return next(new app_error_1.default(err.message, 501));
                    res.json({
                        status: true,
                        message: "Tweet liked",
                    });
                });
            });
        });
        request.write(JSON.stringify({ tweet_id }));
        request.end();
    }
    catch (error) {
        return next(new app_error_1.default(error.message, 501));
    }
});
exports.retweetTweet = (0, catch_async_1.default)(async (req, res, next) => {
    try {
        const token = req.headers.authorization;
        const { id: user_id, mid } = req.user.data;
        const tweet_id = req.params.tid;
        const request = https.request(`https://api.twitter.com/2/users/${user_id}/retweets`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        }, (resp) => {
            let data = "";
            resp.on("data", (chunk) => {
                data += chunk.toString();
            });
            resp.on("error", (err) => {
                console.error(err);
            });
            resp.on("end", () => {
                data = JSON.parse(data);
                if (data.error) {
                    return next(new app_error_1.default(data.error, 503));
                }
                // adding task record to DB
                const updateTweetParams = {
                    Key: {
                        id: { S: tweet_id },
                    },
                    AttributeUpdates: {
                        acted_by: {
                            Action: "ADD",
                            Value: {
                                L: [{ S: mid }],
                            },
                        },
                    },
                    TableName: "Tweets",
                };
                dynamodb.updateItem(updateTweetParams, (err, data) => {
                    if (err)
                        return next(new app_error_1.default(err.message, 501));
                    res.json({
                        status: true,
                        message: "Tweet retweeted",
                    });
                });
            });
        });
        request.write(JSON.stringify({ tweet_id }));
        request.end();
    }
    catch (error) {
        return next(new app_error_1.default(error.message, 501));
    }
});
const replyToTweet = async (req, res) => {
    const token = req.headers.authorization;
    const { tweet_id, text } = req.body;
    const body = {
        text,
        reply: {
            in_reply_to_tweet_id: tweet_id,
        },
    };
    const request = https.request("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    }, (resp) => {
        let data = "";
        resp.on("data", (chunk) => {
            data += chunk.toString();
        });
        resp.on("error", (err) => {
            console.error(err);
        });
        resp.on("end", () => {
            res.json({
                status: true,
                data: JSON.parse(data),
            });
        });
    });
    request.write(JSON.stringify(body));
    request.end();
};
exports.replyToTweet = replyToTweet;
