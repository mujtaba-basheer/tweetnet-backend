import * as crypto from "crypto";
import * as https from "https";
import { config } from "dotenv";
import rs = require("randomstring");
import base64url from "base64url";
config();

const store = {
  code_verifier: "",
};

const algorithm = "aes-256-cbc";
const key = process.env.SALT;
const iv = Buffer.from(process.env.CIPHER_IV).toString("hex");
// Encrypting
export const encrypt = (text: string) => {
  let cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return encrypted.toString("hex");
};

// Decrypting text
export const decrypt = (text: string) => {
  let encryptedText = Buffer.from(text, "hex");
  let decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

// Percent encoding
const percentEncode = (str: string) => {
  return encodeURIComponent(str).replace(/[!*()']/g, (character) => {
    return "%" + character.charCodeAt(0).toString(16);
  });
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
  store.code_verifier = code_verifier;
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
    redirect_uri:
      process.env.NODE_ENV === "production"
        ? process.env.REDIRECT_URI
        : process.env.REDIRECT_URI_DEV,
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

export const regenerateToken: (
  refresh_token: string
) => Promise<{ access_token: string }> = (refresh_token: string) => {
  return new Promise((res, rej) => {
    const request = https.request(
      "https://api.twitter.com/2/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
      (resp) => {
        let data: any = "";
        resp.on("data", (chunk) => {
          data += chunk.toString();
        });
        resp.on("end", () => {
          data = JSON.parse(data);
          if (data.error) {
            rej(new Error(data.error));
          } else {
            data.access_token = encrypt(data.access_token);
            res(data);
          }
        });
        resp.on("error", (err) => {
          console.error(err);
          rej(err);
        });
      }
    );

    const body = {
      refresh_token,
      grant_type: "refresh_token",
      client_id: process.env.CLIENT_ID,
    };

    request.write(new URLSearchParams(body).toString());
    request.end();
  });
};

export const createToken: (
  code: string
) => Promise<{ access_token: string }> = (code: string) => {
  return new Promise((res, rej) => {
    const request = https.request(
      "https://api.twitter.com/2/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
      (resp) => {
        let data: any = "";
        resp.on("data", (chunk) => {
          data += chunk.toString();
        });
        resp.on("end", () => {
          data = JSON.parse(data);
          if (data.error) {
            rej(new Error(data.error));
          } else {
            data.access_token = encrypt(data.access_token);
            res(data);
          }
        });
        resp.on("error", (err) => {
          console.error(err);
          rej(err);
        });
      }
    );

    const body = {
      code,
      grant_type: "authorization_code",
      client_id: process.env.CLIENT_ID,
      redirect_uri:
        process.env.NODE_ENV === "production"
          ? process.env.REDIRECT_URI
          : process.env.REDIRECT_URI_DEV,
      code_verifier: store.code_verifier,
    };

    request.write(new URLSearchParams(body).toString());
    request.end();
  });
};

export const revokeToken: (
  token: string
) => Promise<{ access_token: string }> = (token: string) => {
  return new Promise((res, rej) => {
    const request = https.request(
      "https://api.twitter.com/2/oauth2/revoke",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
      (resp) => {
        let data: any = "";
        resp.on("data", (chunk) => {
          data += chunk.toString();
        });
        resp.on("end", () => {
          data = JSON.parse(data);
          if (data.error) {
            rej(new Error(data.error));
          } else res(data);
        });
        resp.on("error", (err) => {
          console.error(err);
          rej(err);
        });
      }
    );

    const body = {
      token,
      client_id: process.env.CLIENT_ID,
    };

    request.write(new URLSearchParams(body).toString());
    request.end();
  });
};
