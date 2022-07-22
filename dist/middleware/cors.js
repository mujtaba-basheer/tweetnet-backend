"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cors = () => {
    return function (req, res, next) {
        try {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
            res.setHeader("Access-Control-Allow-Credentials", "true");
            next();
        }
        catch (error) {
            console.error(error);
            next();
        }
    };
};
exports.default = cors;
