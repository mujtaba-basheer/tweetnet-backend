import { NextFunction } from "express";
import { Request, Response } from "express";
import AppError from "../utils/app-error";

// for unspecified/unfound routes
export const notFound = (
  req: Express.Request,
  res: Express.Response,
  next: NextFunction
) => {
  return next(new AppError("Route does not exist.", 404));
};

// error handler middleware
export const errorHandler = (
  err: AppError,
  req: Express.Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: false,
    message: err.message,
    // adding error stack in development environment
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};
