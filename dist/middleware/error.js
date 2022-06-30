"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFound = void 0;
const app_error_1 = require("../utils/app-error");
// for unspecified/unfound routes
const notFound = (req, res, next) => {
    return next(new app_error_1.default("Route does not exist.", 404));
};
exports.notFound = notFound;
// error handler middleware
const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        status: false,
        message: err.message,
        // adding error stack in development environment
        stack: process.env.NODE_ENV === "production" ? null : err.stack,
    });
};
exports.errorHandler = errorHandler;
