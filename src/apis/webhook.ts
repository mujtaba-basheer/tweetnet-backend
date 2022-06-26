import { Request, Response } from "express";

export const testWebhook = async (req: Request, res: Response) => {
  console.log(JSON.stringify(req.body));

  res.json(req.body);
};
