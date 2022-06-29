"use strict";
exports.__esModule = true;
var catchAsync = function (fn) {
    return function (req, res, next) {
        fn(req, res, next)["catch"](next);
    };
};
exports["default"] = catchAsync;
