"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createToken = exports.getAuthorizationParamsString = void 0;
const crypto = require("crypto");
const https = require("https");
const dotenv_1 = require("dotenv");
const rs = require("randomstring");
const base64url_1 = require("base64url");
(0, dotenv_1.config)();
const store = {
    code_verifier: "",
};
// Percent encoding
const percentEncode = (str) => {
    return encodeURIComponent(str).replace(/[!*()']/g, (character) => {
        return "%" + character.charCodeAt(0).toString(16);
    });
};
const getRadomString = (len) => {
    return new Promise((res, rej) => {
        crypto.randomBytes(len, (err, buff) => {
            if (err)
                rej(err);
            res(buff.toString("hex"));
        });
    });
};
const getCodeChallenge = () => {
    const code_verifier = rs.generate(128);
    store.code_verifier = code_verifier;
    const base64Digest = crypto
        .createHash("sha256")
        .update(code_verifier)
        .digest("base64");
    const code_challenge = base64url_1.default.fromBase64(base64Digest);
    return code_challenge;
};
const getAuthorizationParamsString = async (scope) => {
    const defaultParams = {
        response_type: "code",
        client_id: process.env.CLIENT_ID,
        redirect_uri: process.env.NODE_ENV === "production"
            ? process.env.REDIRECT_URI
            : process.env.REDIRECT_URI_DEV,
        scope: scope.join(" "),
        state: await getRadomString(100),
        code_challenge: getCodeChallenge(),
        code_challenge_method: "S256",
    };
    const attrs = [];
    for (const key of Object.keys(defaultParams)) {
        attrs.push(`${key}=${percentEncode(defaultParams[key])}`);
    }
    return attrs.join("&");
};
exports.getAuthorizationParamsString = getAuthorizationParamsString;
const createToken = (code) => {
    return new Promise((res, rej) => {
        const request = https.request("https://api.twitter.com/2/oauth2/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        }, (resp) => {
            let data = "";
            resp.on("data", (chunk) => {
                data += chunk.toString();
            });
            resp.on("end", () => {
                data = JSON.parse(data);
                if (data.error) {
                    rej(new Error(data.error));
                }
                else
                    res(data);
            });
            resp.on("error", (err) => {
                console.error(err);
                rej(err);
            });
        });
        const body = {
            code,
            grant_type: "authorization_code",
            client_id: process.env.CLIENT_ID,
            redirect_uri: process.env.NODE_ENV === "production"
                ? process.env.REDIRECT_URI
                : process.env.REDIRECT_URI_DEV,
            code_verifier: store.code_verifier,
        };
        request.write(new URLSearchParams(body).toString());
        request.end();
    });
};
exports.createToken = createToken;
