import { Request, Response, NextFunction } from "express";

const cors = () => {
  return function (req: Request, res: Response, next: NextFunction) {
    try {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
      );
      res.setHeader("Access-Control-Allow-Credentials", "true");
      next();
    } catch (error) {
      console.error(error);
      next();
    }
  };
};

export default cors;
