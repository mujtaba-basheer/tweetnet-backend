"use strict";
exports.__esModule = true;
exports.errorHandler = exports.notFound = void 0;
var app_error_js_1 = require("../utils/app-error.js");
// for unspecified/unfound routes
var notFound = function (req, res, next) {
    return next(new app_error_js_1["default"]("Route does not exist.", 404));
};
exports.notFound = notFound;
// error handler middleware
var errorHandler = function (err, req, res, next) {
    var statusCode = err.statusCode || 500;
    res.status(statusCode);
    res.status(statusCode).json({
        message: err.message,
        // adding error stack in development environment
        stack: process.env.NODE_ENV === "production" ? null : err.stack
    });
};
exports.errorHandler = errorHandler;
