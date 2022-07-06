"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = exports.protect = void 0;
const user_1 = require("../utils/user");
const auth_1 = require("../utils/auth");
const app_error_1 = require("../utils/app-error");
const catch_async_1 = require("../utils/catch-async");
exports.protect = (0, catch_async_1.default)(async (req, res, next) => {
    try {
        const bearerToken = req.headers.authorization;
        if (bearerToken && bearerToken.startsWith("Bearer ")) {
            const unparsed_token = bearerToken.split(" ")[1];
            let [mid, token] = unparsed_token.split(".");
            token = (0, auth_1.decrypt)(token);
            try {
                const user = await (0, user_1.getUserDetails)(token);
                req.headers.authorization = token;
                user.data.mid = mid;
                req.user = user;
                next();
            }
            catch (error) {
                throw new app_error_1.default("Token Invalid or Expired", 403);
            }
        }
        else
            throw new Error("Unauthorized");
    }
    catch (error) {
        return next(new app_error_1.default(error.message, error.statusCode || 401));
    }
});
exports.validate = (0, catch_async_1.default)(async (req, res, next) => {
    try {
        const bearerToken = req.headers.authorization;
        if (bearerToken && bearerToken.startsWith("Bearer ")) {
            const unparsed_token = bearerToken.split(" ")[1];
            let [mid, token] = unparsed_token.split(".");
            token = (0, auth_1.decrypt)(token);
            const user = { data: { mid } };
            req.headers.authorization = token;
            req.user = user;
            next();
        }
        else
            throw new Error("Unauthorized");
    }
    catch (error) {
        return next(new app_error_1.default(error.message, error.statusCode || 401));
    }
});
