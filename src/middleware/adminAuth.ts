import { Request, Response, NextFunction } from "express";

export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const adminKey = req.headers["x-admin-key"];
  const secretKey = process.env.ADMIN_SECRET_KEY;

  if (!adminKey || adminKey !== secretKey) {
    return res.status(403).json({ 
      error: "Access Denied: You do not have permission to perform this action." 
    });
  }

  next();
};