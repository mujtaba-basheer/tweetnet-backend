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
exports.createToken = exports.getAuthorizationParamsString = exports.getAuthorization = void 0;
var crypto = require("crypto");
var https = require("https");
var rs = require("randomstring");
var base64url_1 = require("base64url");
var store = {
    code_verifier: ""
};
// Percent encoding
var percentEncode = function (str) {
    return encodeURIComponent(str).replace(/[!*()']/g, function (character) {
        return "%" + character.charCodeAt(0).toString(16);
    });
};
// HMAC-SHA1 Encoding, uses jsSHA lib
var hmac_sha1 = function (string, secret) {
    var hmacValue = crypto
        .createHmac("sha1", secret)
        .update(string)
        .digest("base64");
    return hmacValue;
};
// Merge two objects
var mergeObjs = function (obj1, obj2) {
    for (var _i = 0, _a = Object.keys(obj2); _i < _a.length; _i++) {
        var attr = _a[_i];
        obj1[attr] = obj2[attr];
    }
    return obj1;
};
// Generate Sorted Parameter String for base string params
var genSortedParamStr = function (params, key, token, timestamp, nonce) {
    // Merge oauth params & request params to single object
    var paramObj = mergeObjs({
        include_entities: "true",
        oauth_consumer_key: key,
        oauth_nonce: nonce,
        oauth_signature_method: "HMAC-SHA1",
        oauth_timestamp: timestamp,
        oauth_token: token,
        oauth_version: "1.0"
    }, params);
    // Sort alphabetically
    var paramObjKeys = Object.keys(paramObj);
    var len = paramObjKeys.length;
    paramObjKeys.sort();
    // Interpolate to string with format as key1=val1&key2=val2&...
    var paramStr = paramObjKeys[0] + "=" + paramObj[paramObjKeys[0]];
    for (var i = 1; i < len; i++) {
        paramStr +=
            "&" +
                paramObjKeys[i] +
                "=" +
                percentEncode(decodeURIComponent(paramObj[paramObjKeys[i]]));
    }
    return paramStr;
};
var oAuthBaseString = function (method, url, params, key, token, timestamp, nonce) {
    return (method +
        "&" +
        percentEncode(url) +
        "&" +
        percentEncode(genSortedParamStr(params, key, token, timestamp, nonce)));
};
var oAuthSigningKey = function (consumer_secret, token_secret) {
    return percentEncode(consumer_secret) + "&" + token_secret
        ? percentEncode(token_secret)
        : "";
};
var oAuthSignature = function (base_string, signing_key) {
    var signature = hmac_sha1(base_string, signing_key);
    return signature;
};
var getAuthorization = function (httpMethod, baseUrl, reqParams) {
    // Get acces keys
    var consumerKey = process.env.API_KEY, consumerSecret = process.env.API_KEY_SECRET, accessToken = process.env.ACCESS_TOKEN, accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
    // timestamp as unix epoch
    var timestamp = Math.round(Date.now() / 1000);
    // nonce as base64 encoded unique random string
    var nonce = Buffer.from(consumerKey + ":" + timestamp).toString("base64");
    // generate signature from base string & signing key
    var baseString = oAuthBaseString(httpMethod, baseUrl, reqParams, consumerKey, accessToken, timestamp, nonce);
    var signingKey = oAuthSigningKey(consumerSecret, baseUrl.endsWith("request_token") ? "" : accessTokenSecret);
    var signature = oAuthSignature(baseString, signingKey);
    // return interpolated string
    return ("OAuth " +
        'oauth_consumer_key="' +
        consumerKey +
        '", ' +
        'oauth_nonce="' +
        nonce +
        '", ' +
        'oauth_signature="' +
        signature +
        '", ' +
        'oauth_signature_method="HMAC-SHA1", ' +
        'oauth_timestamp="' +
        timestamp +
        '", ' +
        'oauth_token="' +
        accessToken +
        '", ' +
        'oauth_version="1.0"');
};
exports.getAuthorization = getAuthorization;
var getRadomString = function (len) {
    return new Promise(function (res, rej) {
        crypto.randomBytes(len, function (err, buff) {
            if (err)
                rej(err);
            res(buff.toString("hex"));
        });
    });
};
var getCodeChallenge = function () {
    var code_verifier = rs.generate(128);
    store.code_verifier = code_verifier;
    var base64Digest = crypto
        .createHash("sha256")
        .update(code_verifier)
        .digest("base64");
    var code_challenge = base64url_1["default"].fromBase64(base64Digest);
    return code_challenge;
};
var getAuthorizationParamsString = function (scope) { return __awaiter(void 0, void 0, void 0, function () {
    var defaultParams, attrs, _i, _a, key;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _b = {
                    response_type: "code",
                    client_id: process.env.CLIENT_ID,
                    redirect_uri: process.env.NODE_ENV === "production"
                        ? process.env.REDIRECT_URI
                        : process.env.REDIRECT_URI_DEV,
                    scope: scope.join(" ")
                };
                return [4 /*yield*/, getRadomString(100)];
            case 1:
                defaultParams = (_b.state = _c.sent(),
                    _b.code_challenge = getCodeChallenge(),
                    _b.code_challenge_method = "S256",
                    _b);
                attrs = [];
                for (_i = 0, _a = Object.keys(defaultParams); _i < _a.length; _i++) {
                    key = _a[_i];
                    attrs.push("".concat(key, "=").concat(percentEncode(defaultParams[key])));
                }
                return [2 /*return*/, attrs.join("&")];
        }
    });
}); };
exports.getAuthorizationParamsString = getAuthorizationParamsString;
var createToken = function (code) {
    return new Promise(function (res, rej) {
        var request = https.request("https://api.twitter.com/2/oauth2/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        }, function (resp) {
            var data = "";
            resp.on("data", function (chunk) {
                data += chunk.toString();
            });
            resp.on("end", function () {
                res(JSON.parse(data));
            });
            resp.on("error", function (err) {
                console.error(err);
                rej(err);
            });
        });
        var body = {
            code: code,
            grant_type: "authorization_code",
            client_id: process.env.CLIENT_ID,
            redirect_uri: process.env.NODE_ENV === "production"
                ? process.env.REDIRECT_URI
                : process.env.REDIRECT_URI_DEV,
            code_verifier: store.code_verifier
        };
        request.write(new URLSearchParams(body).toString());
        request.end();
    });
};
exports.createToken = createToken;
