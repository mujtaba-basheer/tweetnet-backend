"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replyToTweet = exports.retweetTweet = exports.likeTweet = exports.getTweetsByTask = exports.getTweets = exports.forwardTweets = exports.getMyTweets = exports.getFollows = void 0;
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
    const user = req.user.data;
    const request = https.request(`https://api.twitter.com/2/users/${user_id}/tweets?max_results=100&exclude=replies,retweets&expansions=author_id,attachments.media_keys&media.fields=media_key,type,url,preview_image_url&tweet.fields=created_at`, {
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
            const { data: tweets, includes } = tweeetsResp;
            for (const tweet of tweets) {
                const d = new Date(`${tweet.created_at}`);
                tweet.created_at = { date: "", time: "" };
                const dateArr = d
                    .toLocaleDateString(undefined, {
                    dateStyle: "medium",
                })
                    .split("-");
                tweet.created_at.date = `${dateArr[1]} ${dateArr[0]}, ${dateArr[2]}`;
                tweet.created_at.time = d
                    .toLocaleTimeString(undefined, {
                    timeStyle: "short",
                    hour12: true,
                })
                    .toUpperCase();
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
                data: {
                    author_details: {
                        name: user.name,
                        username: user.username,
                        profile_image_url: user.profile_image_url,
                    },
                    tweets: tweeetsResp.data,
                },
            });
        });
    });
    request.end();
});
exports.forwardTweets = (0, catch_async_1.default)(async (req, res, next) => {
    try {
        const forwardTweet = req.body;
        const created_at = new Date().valueOf();
        const forwardTweets = [];
        const { tasks, id } = forwardTweet;
        for (const task of tasks) {
            if (["like", "retweet", "reply"].includes(task)) {
                const tweetObj = {
                    id: `${id}.${created_at}.${task}`,
                    task,
                };
                forwardTweets.push(tweetObj);
            }
            else
                return next(new app_error_1.default("Bad Request", 400));
        }
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
            const created_at = new Date();
            const putTweets = [];
            const newStats = Object.assign({}, user.stats);
            const messages = [];
            for (const tweet of forwardTweets) {
                const { task } = tweet;
                let { count: { N: count }, last_posted: { S: last_posted }, } = newStats.M[task].M;
                let c = +count;
                const sid = user.membership.M.subscribed_to.S;
                const n = 1;
                const limit_o = subscription_1.default.find((x) => x.sid === sid);
                // checking daily limits
                if (limit_o) {
                    const limit = limit_o.limit[task];
                    const created_at_date = created_at.toISOString().substring(0, 10);
                    const last_posted_date = last_posted.substring(0, 10);
                    try {
                        if (last_posted_date < created_at_date) {
                            if (n <= limit) {
                                newStats.M[task].M.count = { N: n + "" };
                                newStats.M[task].M.last_posted = {
                                    S: created_at.toISOString(),
                                };
                            }
                            else
                                throw new Error(`Limit exceeded for: ${task.toUpperCase()}`);
                        }
                        else if (n + c <= limit) {
                            newStats.M[task].M.count = { N: c + n + "" };
                            newStats.M[task].M.last_posted = {
                                S: created_at.toISOString(),
                            };
                        }
                        else
                            throw new Error(`Limit exceeded for: ${task.toUpperCase()}`);
                        putTweets.push(tweet);
                        messages.push({
                            tag: task,
                            status: true,
                            message: "Tweet forwarded successfully",
                        });
                    }
                    catch (error) {
                        messages.push({
                            tag: task,
                            status: false,
                            message: error.message,
                        });
                        continue;
                    }
                }
                else
                    return next(new app_error_1.default("Subscription not found", 404));
            }
            if (putTweets.length > 0) {
                const putTweetsParams = {
                    RequestItems: {
                        Tweets: putTweets.map((t) => ({
                            PutRequest: {
                                Item: {
                                    id: { S: t.id },
                                    task: { S: t.task },
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
                            ":stats": newStats,
                        },
                        TableName: "Users",
                    };
                    dynamodb.updateItem(updateUserParams, (err, data) => {
                        if (err)
                            return next(new app_error_1.default(err.message, 503));
                        res.json({
                            status: true,
                            data: messages,
                        });
                    });
                });
            }
            else
                return res.json({
                    status: true,
                    data: messages,
                });
        });
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
const getTweetsByTask = async (req, res, next) => {
    const token = req.headers.authorization;
    const { mid } = req.user.data;
    const { task } = req.params;
    try {
        // getting tweets from DB
        const getTweetsParams = {
            FilterExpression: "#T = :T AND #CB <> :CB AND NOT contains(#AB, :CB)",
            ExpressionAttributeNames: {
                "#CB": "created_by",
                "#AB": "acted_by",
                "#ID": "id",
                "#T": "task",
            },
            ExpressionAttributeValues: {
                ":CB": {
                    S: mid,
                },
                ":T": {
                    S: task,
                },
            },
            ProjectionExpression: "#ID",
            Limit: 100,
            TableName: "Tweets",
        };
        dynamodb.scan(getTweetsParams, (err, data) => {
            if (err)
                return next(new app_error_1.default(err.message, 503));
            const ids = data.Items.map((x) => x.id.S);
            const tweet_ids = ids.map((x) => x.split(".")[0]);
            const idMap = {};
            for (let i = 0; i < ids.length; i++)
                idMap[tweet_ids[i]] = ids[i];
            const request = https.request(`https://api.twitter.com/2/tweets?ids=${tweet_ids.join(",")}&expansions=author_id,attachments.media_keys&media.fields=media_key,type,url,preview_image_url&user.fields=profile_image_url&tweet.fields=created_at`, {
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
                        return next(new app_error_1.default(tweeetsResp.title, 503));
                    const { data: tweets, includes, meta } = tweeetsResp;
                    const authorMap = {};
                    const attachementsMap = {};
                    for (const user of includes.users) {
                        authorMap[user.id] = user;
                    }
                    for (const media of includes.media) {
                        attachementsMap[media.media_key] = media;
                    }
                    for (const tweet of tweets) {
                        const d = new Date(`${tweet.created_at}`);
                        tweet.created_at = { date: "", time: "" };
                        const dateArr = d
                            .toLocaleDateString(undefined, {
                            dateStyle: "medium",
                        })
                            .split("-");
                        tweet.created_at.date = `${dateArr[1]} ${dateArr[0]}, ${dateArr[2]}`;
                        tweet.created_at.time = d
                            .toLocaleTimeString(undefined, {
                            timeStyle: "short",
                            hour12: true,
                        })
                            .toUpperCase();
                        tweet.author_details = authorMap[tweet.author_id];
                        if (tweet.attachments &&
                            tweet.attachments.media_keys.length > 0) {
                            for (const media_key of tweet.attachments.media_keys) {
                                const media = attachementsMap[media_key];
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
                        tweet.id = idMap[tweet.id];
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
    }
    catch (error) {
        return next(new app_error_1.default(error.message, 501));
    }
};
exports.getTweetsByTask = getTweetsByTask;
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
exports.replyToTweet = (0, catch_async_1.default)(async (req, res, next) => {
    try {
        const token = req.headers.authorization;
        const { mid } = req.user.data;
        const tweet_id = req.params.tid;
        const { text } = req.body;
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
                        message: "Tweet replied to",
                    });
                });
            });
        });
        request.write(JSON.stringify(body));
        request.end();
    }
    catch (error) {
        return next(new app_error_1.default(error.message, 501));
    }
});
