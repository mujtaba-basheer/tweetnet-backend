import { Request, Response } from "express";

export const testWebhook = async (req: Request, res: Response) => {
  res.json(req.body);
};
