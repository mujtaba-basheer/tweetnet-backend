import fetch from "node-fetch";
import { config } from "dotenv";
config({ path: ".env" });

class HTTPResponseError extends Error {
  constructor(status, statusText, ...args) {
    super(`HTTP Error Response: ${status} ${statusText}`, ...args);
    this.statusCode = status;
  }
}

class ApiCall {
  constructor() {
    this.baseurl = process.env.BASE_URL;
    this.token = "";
    this.headers = { Authenticate: "" };
    this.timeLapsed = new Date().getTime();

    this.authenticate();
  }

  authenticate() {
    return new Promise((res, rej) => {
      const currTime = new Date().getTime();
      if (this.token && currTime - this.timeLapsed < 20 * 60 * 1000)
        return res(null);

      fetch(this.baseurl + "/api/Security/Login", {
        method: "POST",
        body: JSON.stringify({
          Username: process.env.USER_NAME,
          Password: process.env.PASSWORD,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((resp) => {
          if (resp.ok) return resp.json();
          else throw new HTTPResponseError(resp.status, resp.statusText);
        })
        .then((resp) => {
          this.timeLapsed = new Date().getTime();
          this.token = resp;
          this.headers.Authenticate = `Avala-Api ${this.token}`;
          res(null);
        })
        .catch((err) => rej(err));
    });
  }

  async getReq(url) {
    try {
      await this.authenticate();
      return new Promise(async (res, rej) => {
        fetch(this.baseurl + url, {
          method: "GET",
          headers: { ...this.headers },
        })
          .then((resp) => {
            if (resp.ok) return resp.json();
            else throw new HTTPResponseError(resp.status, resp.statusText);
          })
          .then((resp) => {
            res(resp);
          })
          .catch((err) => rej(err));
      });
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async postReq(url, data) {
    try {
      await this.authenticate();
      return new Promise(async (res, rej) => {
        fetch(this.baseurl + url, {
          method: "POST",
          headers: { ...this.headers, "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
          .then((resp) => {
            if (resp.ok) return resp.json();
            else throw new HTTPResponseError(resp.status);
          })
          .then((resp) => {
            if (!resp["TopLevelError"]) res(resp);
            else throw new HTTPResponseError(400, "Bad Request");
          })
          .catch((err) => rej(err));
      });
    } catch (error) {
      return Promise.reject(error);
    }
  }
}

export default ApiCall;
