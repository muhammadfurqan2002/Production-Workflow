import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { verifyAccessToken } from "../lib/token";
import prisma from "../config/db";

export async function checkAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  try {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "You are not authorized" });
    }

    const token = authHeader.split(" ")[1];
    const { sub, tokenVersion } = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: Number(sub) },
    });
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.tokenVersion != Number(tokenVersion)) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const authReq = req as any;
    authReq.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    };
    next();
  } catch (error) {
    console.log(error);
    return res.status(401).json({ message: "You are not authorized" });
  }
}
