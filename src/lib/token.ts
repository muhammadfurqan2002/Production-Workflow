import jwt from "jsonwebtoken";

export const createAccessToken = (
  userId: number,
  role: "USER" | "ADMIN",
  tokenVersion: number,
) => {
  return jwt.sign(
    { sub: userId, role, tokenVersion },
    process.env.JWT_ACCESS_TOKEN!,
    { expiresIn: "15m" },
  );
};

export const createRefreshToken = (userId: number, tokenVersion: number) => {
  return jwt.sign(
    { sub: userId, tokenVersion },
    process.env.JWT_REFRESH_TOKEN!,
    { expiresIn: "7d" },
  );
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_REFRESH_TOKEN!) as {
    sub: string;
    tokenVersion: number;
  };
};
