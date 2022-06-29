import { Request, Response, NextFunction } from "express";

interface Func {
  (req: Request, res: Response, next: NextFunction): any;
}

const catchAsync = (fn: Func) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

export default catchAsync;
