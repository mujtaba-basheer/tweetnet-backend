import { Request, Response, NextFunction } from "express";
import { getUserDetails } from "../utils/user";
import { decrypt } from "../utils/auth";
import AppError from "../utils/app-error";
import catchAsync from "../utils/catch-async";

export const protect = catchAsync(
  async (req: Request & { user: any }, res: Response, next: NextFunction) => {
    try {
      const bearerToken = req.headers.authorization;
      if (bearerToken && bearerToken.startsWith("Bearer ")) {
        const unparsed_token = bearerToken.split(" ")[1];
        let [mid, token] = unparsed_token.split(".");
        token = decrypt(token);
        try {
          const user = await getUserDetails(token);
          req.headers.authorization = token;
          user.data.mid = mid;
          req.user = user;
          next();
        } catch (error) {
          throw new AppError("Token Invalid or Expired", 403);
        }
      } else throw new Error("Unauthorized");
    } catch (error) {
      return next(new AppError(error.message, error.statusCode || 401));
    }
  }
);

export const validate = catchAsync(
  async (req: Request & { user: any }, res: Response, next: NextFunction) => {
    try {
      const bearerToken = req.headers.authorization;
      if (bearerToken && bearerToken.startsWith("Bearer ")) {
        const unparsed_token = bearerToken.split(" ")[1];
        let [mid, token] = unparsed_token.split(".");
        token = decrypt(token);
        const user = { data: { mid } };
        req.headers.authorization = token;
        req.user = user;
        next();
      } else throw new Error("Unauthorized");
    } catch (error) {
      return next(new AppError(error.message, error.statusCode || 401));
    }
  }
);
