import { Request, Response, NextFunction } from "express";
import { getUserDetails } from "../utils/user";
import AppError from "../utils/app-error";
import catchAsync from "../utils/catch-async";

export const protect = catchAsync(
  async (req: Request & { user: any }, res: Response, next: NextFunction) => {
    try {
      const bearerToken = req.headers.authorization;
      if (bearerToken && bearerToken.startsWith("Bearer ")) {
        const unparsed_token = bearerToken.split(" ")[1];
        const i = unparsed_token.indexOf("K2a");
        const token = unparsed_token.substring(0, i);
        const id = unparsed_token.slice(i + 3, -4);
        req.headers.authorization = token;
        const user = await getUserDetails(token);
        user.data.mid = id;
        req.user = user;
        next();
      } else throw new Error("Unauthorized");
    } catch (error) {
      return next(new AppError(error.message, error.statusCode || 401));
    }
  }
);
