"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
const user_1 = require("../utils/user");
const app_error_1 = require("../utils/app-error");
const catch_async_1 = require("../utils/catch-async");
exports.protect = (0, catch_async_1.default)(async (req, res, next) => {
    try {
        const bearerToken = req.headers.authorization;
        if (bearerToken && bearerToken.startsWith("Bearer ")) {
            const unparsed_token = bearerToken.split(" ")[1];
            const i = unparsed_token.indexOf("K2a");
            const id = unparsed_token.substring(0, i);
            const token = unparsed_token.slice(i + 3, -4);
            req.headers.authorization = token;
            const user = await (0, user_1.getUserDetails)(token);
            user.data.mid = id;
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
