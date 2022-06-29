import { Request, Response, NextFunction } from "express";
import { getUserDetails } from "../utils/user";
import AppError from "../utils/app-error";

export const protect = async (
  req: Request & { user: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const bearerToken = req.headers.authorization;
    if (bearerToken && bearerToken.startsWith("Bearer ")) {
      const token = bearerToken.split(" ")[0];
      req.headers.authorization = token;
      const user = await getUserDetails(token);
      req.user = user;
    } else throw new Error("Unauthorized");
  } catch (error) {
    return next(new AppError(error.message, 401));
  }
};
