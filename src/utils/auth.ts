import * as crypto from "crypto";
import rs = require("randomstring");
import base64url from "base64url";

// Percent encoding
const percentEncode = (str: string) => {
  return encodeURIComponent(str).replace(/[!*()']/g, (character) => {
    return "%" + character.charCodeAt(0).toString(16);
  });
};

// HMAC-SHA1 Encoding, uses jsSHA lib
const hmac_sha1 = (string: string, secret: string) => {
  const hmacValue = crypto
    .createHmac("sha1", secret)
    .update(string)
    .digest("base64");
  return hmacValue;
};

// Merge two objects
const mergeObjs = (obj1: object, obj2: object) => {
  for (const attr of Object.keys(obj2)) {
    obj1[attr] = obj2[attr];
  }
  return obj1;
};

// Generate Sorted Parameter String for base string params
const genSortedParamStr = (
  params: object,
  key: string,
  token: string,
  timestamp: number,
  nonce: string
) => {
  // Merge oauth params & request params to single object
  let paramObj: object = mergeObjs(
    {
      include_entities: "true",
      oauth_consumer_key: key,
      oauth_nonce: nonce,
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: timestamp,
      oauth_token: token,
      oauth_version: "1.0",
    },
    params
  );
  // Sort alphabetically
  let paramObjKeys = Object.keys(paramObj);
  let len = paramObjKeys.length;
  paramObjKeys.sort();
  // Interpolate to string with format as key1=val1&key2=val2&...
  let paramStr = paramObjKeys[0] + "=" + paramObj[paramObjKeys[0]];
  for (var i = 1; i < len; i++) {
    paramStr +=
      "&" +
      paramObjKeys[i] +
      "=" +
      percentEncode(decodeURIComponent(paramObj[paramObjKeys[i]]));
  }
  return paramStr;
};

const oAuthBaseString = (
  method: string,
  url: string,
  params: object,
  key: string,
  token: string,
  timestamp: number,
  nonce: string
) => {
  return (
    method +
    "&" +
    percentEncode(url) +
    "&" +
    percentEncode(genSortedParamStr(params, key, token, timestamp, nonce))
  );
};

const oAuthSigningKey = (consumer_secret: string, token_secret?: string) => {
  return percentEncode(consumer_secret) + "&" + token_secret
    ? percentEncode(token_secret)
    : "";
};

const oAuthSignature = (base_string: string, signing_key: string) => {
  const signature = hmac_sha1(base_string, signing_key);
  return signature;
};

export const getAuthorization = (
  httpMethod: string,
  baseUrl: string,
  reqParams: object
) => {
  // Get acces keys
  const consumerKey = process.env.API_KEY,
    consumerSecret = process.env.API_KEY_SECRET,
    accessToken = process.env.ACCESS_TOKEN,
    accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
  // timestamp as unix epoch
  let timestamp = Math.round(Date.now() / 1000);
  // nonce as base64 encoded unique random string
  let nonce = Buffer.from(consumerKey + ":" + timestamp).toString("base64");
  // generate signature from base string & signing key
  let baseString = oAuthBaseString(
    httpMethod,
    baseUrl,
    reqParams,
    consumerKey,
    accessToken,
    timestamp,
    nonce
  );
  let signingKey = oAuthSigningKey(
    consumerSecret,
    baseUrl.endsWith("request_token") ? "" : accessTokenSecret
  );
  let signature = oAuthSignature(baseString, signingKey);
  // return interpolated string
  return (
    "OAuth " +
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
    'oauth_version="1.0"'
  );
};

const getRadomString: (len: number) => Promise<string> = (len: number) => {
  return new Promise((res, rej) => {
    crypto.randomBytes(len, (err, buff) => {
      if (err) rej(err);
      res(buff.toString("hex"));
    });
  });
};

const getCodeChallenge = () => {
  const code_verifier = rs.generate(128);
  const base64Digest = crypto
    .createHash("sha256")
    .update(code_verifier)
    .digest("base64");

  const code_challenge = base64url.fromBase64(base64Digest);
  return code_challenge;
};

export const getAuthorizationParamsString = async (scope: string[]) => {
  const defaultParams = {
    response_type: "code",
    client_id: process.env.CLIENT_ID,
    redirect_uri: process.env.REDIRECT_URI,
    scope: scope.join(" "),
    state: await getRadomString(100),
    code_challenge: getCodeChallenge(),
    code_challenge_method: "S256",
  };

  const attrs: string[] = [];

  for (const key of Object.keys(defaultParams)) {
    attrs.push(`${key}=${percentEncode(defaultParams[key])}`);
  }

  return attrs.join("&");
};
