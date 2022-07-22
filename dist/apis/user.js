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
    endpoint: "dynamodb.us-east-1.amazonaws.com",
    credentials,
    region: "us-east-1",
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
    try {
        const token = req.headers.authorization;
        const { id: user_id, mid } = req.user.data;
        const author = req.user.data;
        // checking if all limits have been exceeded
        const getUserParams = {
            Key: {
                id: { S: mid },
            },
            TableName: "Users",
        };
        dynamodb.getItem(getUserParams, (err, data) => {
            if (err || !data.Item) {
                return next(new app_error_1.default(err.message, 503));
            }
            const user = data.Item;
            const present_date = new Date().toISOString();
            const { stats: { M: { self: { M: stats }, }, }, membership: { M: { subscribed_to: { S: subscribed_to }, }, }, } = user;
            const limit_o = subscription_1.default.find((x) => x.sid === subscribed_to);
            if (limit_o) {
                const { limit: { self: limit }, } = limit_o;
                let flag = true;
                for (const task of Object.keys(stats)) {
                    const { M: { count: { N: count }, last_posted: { S: last_posted }, }, } = stats[task];
                    const c = +count;
                    const l = limit[task];
                    if (last_posted.substring(0, 10) < present_date.substring(0, 10) ||
                        c < l) {
                        flag = false;
                        break;
                    }
                }
                if (!flag) {
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
                                tweet.created_at.date =
                                    `${dateArr[1]} ${dateArr[0]}, ${dateArr[2]}`.replace(/undefined/g, "");
                                tweet.created_at.time = d
                                    .toLocaleTimeString(undefined, {
                                    timeStyle: "short",
                                    hour12: true,
                                })
                                    .toUpperCase();
                                if (tweet.attachments &&
                                    tweet.attachments.media_keys.length > 0) {
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
                                        name: author.name,
                                        username: author.username,
                                        profile_image_url: author.profile_image_url,
                                    },
                                    tweets: tweeetsResp.data,
                                    limit_exceeded: false,
                                },
                            });
                        });
                    });
                    request.end();
                }
                else {
                    res.json({
                        status: true,
                        data: {
                            author_details: {
                                name: author.name,
                                username: author.username,
                                profile_image_url: author.profile_image_url,
                            },
                            tweets: [],
                            limit_exceeded: true,
                        },
                    });
                }
            }
            else {
                return next(new app_error_1.default(`Subscription Not Found: ${subscribed_to}`, 404));
            }
        });
    }
    catch (error) {
        return next(new app_error_1.default(error.message, 501));
    }
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
            const newStats = Object.assign({}, user.stats.M);
            const messages = [];
            let flag = true;
            const tasksSet = new Set(["like", "reply", "retweet"]);
            const sid = user.membership.M.subscribed_to.S;
            const limit_o = subscription_1.default.find((x) => x.sid === sid);
            if (limit_o) {
                for (const tweet of forwardTweets) {
                    const { task } = tweet;
                    tasksSet.delete(task);
                    let { count: { N: count }, last_posted: { S: last_posted }, } = newStats.self.M[task].M;
                    let c = +count;
                    const n = 1;
                    const limit = limit_o.limit.self[task];
                    const created_at_date = created_at.toISOString().substring(0, 10);
                    const last_posted_date = last_posted.substring(0, 10);
                    try {
                        if (last_posted_date < created_at_date) {
                            if (n <= limit) {
                                newStats.self.M[task].M.count = { N: n + "" };
                                newStats.self.M[task].M.last_posted = {
                                    S: created_at.toISOString(),
                                };
                                if (n < limit)
                                    flag = false;
                            }
                            else
                                throw new Error(`Limit exceeded for: ${task.toUpperCase()}`);
                        }
                        else if (n + c <= limit) {
                            newStats.self.M[task].M.count = { N: c + n + "" };
                            newStats.self.M[task].M.last_posted = {
                                S: created_at.toISOString(),
                            };
                            if (n + c < limit)
                                flag = false;
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
                for (const task of Array.from(tasksSet)) {
                    const limit = limit_o.limit.self[task];
                    const created_at_date = created_at.toISOString().substring(0, 10);
                    const last_posted_date = newStats.self.M[task].M.last_posted.S.substring(0, 10);
                    const count = +newStats.self.M[task].M.count.N;
                    if (last_posted_date < created_at_date || count < limit)
                        flag = false;
                }
            }
            else
                return next(new app_error_1.default("Subscription not found", 404));
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
                            ":stats": { M: newStats },
                        },
                        TableName: "Users",
                    };
                    dynamodb.updateItem(updateUserParams, (err, data) => {
                        if (err)
                            return next(new app_error_1.default(err.message, 503));
                        res.json({
                            status: true,
                            data: { messages, limit_exceeded: flag },
                        });
                    });
                });
            }
            else
                return res.json({
                    status: true,
                    data: { messages, limit_exceeded: flag },
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
    const task = req.params.task;
    try {
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
            const sid = user.membership.M.subscribed_to.S;
            const limit_o = subscription_1.default.find((x) => x.sid === sid);
            const current_posted = new Date().toISOString();
            if (limit_o) {
                const l = limit_o.limit.others[task];
                const newStats = user.stats;
                const { count: { N: count }, last_posted: { S: last_posted }, } = newStats.M.others.M[task].M;
                const c = +count;
                const current_date = current_posted.substring(0, 10);
                const last_date = last_posted.substring(0, 10);
                if (current_date === last_date && c >= l) {
                    return res.json({
                        status: true,
                        data: {
                            limit_exceeded: true,
                            tweets: [],
                        },
                    });
                }
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
                            const { data: tweets, includes } = tweeetsResp;
                            const authorMap = {};
                            const attachementsMap = {};
                            for (const user of includes.users) {
                                authorMap[user.id] = user;
                            }
                            if (includes.media) {
                                for (const media of includes.media) {
                                    attachementsMap[media.media_key] = media;
                                }
                            }
                            for (const tweet of tweets) {
                                const d = new Date(`${tweet.created_at}`);
                                tweet.created_at = { date: "", time: "" };
                                const dateArr = d
                                    .toLocaleDateString(undefined, {
                                    dateStyle: "medium",
                                })
                                    .split("-");
                                tweet.created_at.date =
                                    `${dateArr[1]} ${dateArr[0]}, ${dateArr[2]}`.replace(/undefined/g, "");
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
                                data: {
                                    limit_exceeded: false,
                                    tweets: tweeetsResp.data,
                                },
                            });
                        });
                    });
                    request.end();
                });
            }
            else
                return next(new app_error_1.default("Subscription Not Found", 404));
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
        const id = req.params.id;
        const tid = id.split(".")[0];
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
            const newStats = Object.assign({}, user.stats.M);
            const task = "like";
            const { count: { N: count }, last_posted: { S: last_posted }, } = newStats.others.M[task].M;
            const c = +count;
            const sid = user.membership.M.subscribed_to.S;
            const n = 1;
            const limit_o = subscription_1.default.find((x) => x.sid === sid);
            // checking daily limits
            if (limit_o) {
                const limit = limit_o.limit.others[task];
                const created_at_date = created_at.toISOString().substring(0, 10);
                const last_posted_date = last_posted.substring(0, 10);
                try {
                    if (last_posted_date < created_at_date) {
                        if (n <= limit) {
                            newStats.others.M[task].M.count = { N: n + "" };
                            newStats.others.M[task].M.last_posted = {
                                S: created_at.toISOString(),
                            };
                        }
                        else
                            throw new Error("Limit exceeded for: LIKE");
                    }
                    else if (n + c <= limit) {
                        newStats.others.M[task].M.count = { N: c + n + "" };
                        newStats.others.M[task].M.last_posted = {
                            S: created_at.toISOString(),
                        };
                    }
                    else
                        throw new Error("Limit exceeded for: LIKE");
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
                                    id: { S: id },
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
                                const updateUserParams = {
                                    Key: { id: { S: mid } },
                                    UpdateExpression: "SET #stats=:stats",
                                    ExpressionAttributeNames: {
                                        "#stats": "stats",
                                    },
                                    ExpressionAttributeValues: {
                                        ":stats": { M: newStats },
                                    },
                                    TableName: "Users",
                                };
                                dynamodb.updateItem(updateUserParams, (err, data) => {
                                    if (err)
                                        return next(new app_error_1.default(err.message, 503));
                                    res.json({
                                        status: true,
                                        data: {
                                            message: "Tweet liked",
                                            limit_exceeded: c + n === limit,
                                        },
                                    });
                                });
                            });
                        });
                    });
                    request.write(JSON.stringify({ tweet_id: tid }));
                    request.end();
                }
                catch (error) {
                    res.json({
                        status: true,
                        data: {
                            limit_exceeded: true,
                            message: error.message,
                        },
                    });
                }
            }
            else
                return next(new app_error_1.default("Subscription not found", 404));
        });
    }
    catch (error) {
        return next(new app_error_1.default(error.message, 501));
    }
});
exports.retweetTweet = (0, catch_async_1.default)(async (req, res, next) => {
    try {
        const token = req.headers.authorization;
        const { id: user_id, mid } = req.user.data;
        const id = req.params.id;
        const tid = id.split(".")[0];
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
            const newStats = Object.assign({}, user.stats.M);
            const task = "retweet";
            const { count: { N: count }, last_posted: { S: last_posted }, } = newStats.others.M[task].M;
            const c = +count;
            const sid = user.membership.M.subscribed_to.S;
            const n = 1;
            const limit_o = subscription_1.default.find((x) => x.sid === sid);
            // checking daily limits
            if (limit_o) {
                const limit = limit_o.limit.others[task];
                const created_at_date = created_at.toISOString().substring(0, 10);
                const last_posted_date = last_posted.substring(0, 10);
                try {
                    if (last_posted_date < created_at_date) {
                        if (n <= limit) {
                            newStats.others.M[task].M.count = { N: n + "" };
                            newStats.others.M[task].M.last_posted = {
                                S: created_at.toISOString(),
                            };
                        }
                        else
                            throw new Error("Limit exceeded for: RETWEET");
                    }
                    else if (n + c <= limit) {
                        newStats.others.M[task].M.count = { N: c + n + "" };
                        newStats.others.M[task].M.last_posted = {
                            S: created_at.toISOString(),
                        };
                    }
                    else
                        throw new Error("Limit exceeded for: RETWEET");
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
                                    id: { S: id },
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
                                const updateUserParams = {
                                    Key: { id: { S: mid } },
                                    UpdateExpression: "SET #stats=:stats",
                                    ExpressionAttributeNames: {
                                        "#stats": "stats",
                                    },
                                    ExpressionAttributeValues: {
                                        ":stats": { M: newStats },
                                    },
                                    TableName: "Users",
                                };
                                dynamodb.updateItem(updateUserParams, (err, data) => {
                                    if (err)
                                        return next(new app_error_1.default(err.message, 503));
                                    res.json({
                                        status: true,
                                        data: {
                                            message: "Tweet retweeted",
                                            limit_exceeded: c + n === limit,
                                        },
                                    });
                                });
                            });
                        });
                    });
                    request.write(JSON.stringify({ tweet_id: tid }));
                    request.end();
                }
                catch (error) {
                    res.json({
                        status: true,
                        data: {
                            limit_exceeded: true,
                            message: error.message,
                        },
                    });
                }
            }
            else
                return next(new app_error_1.default("Subscription not found", 404));
        });
    }
    catch (error) {
        return next(new app_error_1.default(error.message, 501));
    }
});
exports.replyToTweet = (0, catch_async_1.default)(async (req, res, next) => {
    try {
        const token = req.headers.authorization;
        const { id: user_id, mid } = req.user.data;
        const id = req.params.id;
        const tid = id.split(".")[0];
        const { text } = req.body;
        const body = {
            text,
            reply: {
                in_reply_to_tweet_id: tid,
            },
        };
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
            const newStats = Object.assign({}, user.stats.M);
            const task = "reply";
            const { count: { N: count }, last_posted: { S: last_posted }, } = newStats.others.M[task].M;
            const c = +count;
            const sid = user.membership.M.subscribed_to.S;
            const n = 1;
            const limit_o = subscription_1.default.find((x) => x.sid === sid);
            // checking daily limits
            if (limit_o) {
                const limit = limit_o.limit.others[task];
                const created_at_date = created_at.toISOString().substring(0, 10);
                const last_posted_date = last_posted.substring(0, 10);
                try {
                    if (last_posted_date < created_at_date) {
                        if (n <= limit) {
                            newStats.others.M[task].M.count = { N: n + "" };
                            newStats.others.M[task].M.last_posted = {
                                S: created_at.toISOString(),
                            };
                        }
                        else
                            throw new Error("Limit exceeded for: REPLY");
                    }
                    else if (n + c <= limit) {
                        newStats.others.M[task].M.count = { N: c + n + "" };
                        newStats.others.M[task].M.last_posted = {
                            S: created_at.toISOString(),
                        };
                    }
                    else
                        throw new Error("Limit exceeded for: REPLY");
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
                                    id: { S: id },
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
                                const updateUserParams = {
                                    Key: { id: { S: mid } },
                                    UpdateExpression: "SET #stats=:stats",
                                    ExpressionAttributeNames: {
                                        "#stats": "stats",
                                    },
                                    ExpressionAttributeValues: {
                                        ":stats": { M: newStats },
                                    },
                                    TableName: "Users",
                                };
                                dynamodb.updateItem(updateUserParams, (err, data) => {
                                    if (err)
                                        return next(new app_error_1.default(err.message, 503));
                                    res.json({
                                        status: true,
                                        data: {
                                            message: "Tweet replied to",
                                            limit_exceeded: c + n === limit,
                                        },
                                    });
                                });
                            });
                        });
                    });
                    request.write(JSON.stringify(body));
                    request.end();
                }
                catch (error) {
                    res.json({
                        status: true,
                        data: {
                            limit_exceeded: true,
                            message: error.message,
                        },
                    });
                }
            }
            else
                return next(new app_error_1.default("Subscription not found", 404));
        });
    }
    catch (error) {
        return next(new app_error_1.default(error.message, 501));
    }
});
