import { NextFunction, Request, Response } from "express";

export function requireRole(role: "USER" | "ADMIN") {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as any;

    if (!authReq.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (authReq.user.role !== role.toUpperCase()) {
      return res.status(403).json({
        message: "You don't have permission to perform this action!",
      });
    }
    next();
  };
}
