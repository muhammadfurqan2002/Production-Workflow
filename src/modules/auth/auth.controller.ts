import { Request, Response } from "express";
import { loginSchema, registerSchema } from "./auth.schema";
import { comparePassword, hashPassword } from "../../lib/hash";
import jwt from "jsonwebtoken";
import { sendEmail } from "../../lib/email";
import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} from "../../lib/token";
import prisma from "../../config/db";
import crypto from "crypto";
import { generateSecret, generate, verify, generateURI } from "otplib";

function getAppUrl() {
  return process.env.APP_URL || `http://localhost:${process.env.PORT}`;
}

export async function registerHandler(req: Request, res: Response) {
  try {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .json({ message: "Invalid data!", error: result.error.flatten });
    }

    const { email, password, name } = result.data;
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
      },
    });
    const verificationToken = jwt.sign(
      {
        sub: user.id,
      },
      process.env.JWT_ACCESS_TOKEN!,
      {
        expiresIn: "1d",
      },
    );

    const verifyUrl = `${getAppUrl()}/api/auth/verify-email?token=${verificationToken}`;

    await sendEmail(
      user.email,
      "Verify your email",
      `
        <p>Please verify your email using this link: <a href='${verifyUrl}'>Verify email</a></p>
        `,
    );

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isEmailVerified: user.isEmailVerified,
        role: user.role,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function verifyEmail(req: Request, res: Response) {
  try {
    const token = req.query.token;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    const decode = jwt.verify(
      token as string,
      process.env.JWT_ACCESS_TOKEN!,
    ) as {
      sub: string;
    };
    const user = await prisma.user.findUnique({
      where: { id: Number(decode.sub) },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, updatedAt: new Date() },
    });
    return res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export const loginHandler = async (req: Request, res: Response) => {
  try {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .json({ message: "Invalid data!", error: result.error.flatten });
    }
    const { email, password, twoFactorCode } = result.data;
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid password" });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ message: "Please verify your email!" });
    }

    if (user.twoFactorEnabled) {
      if (!twoFactorCode || typeof twoFactorCode !== "string") {
        return res.status(400).json({ message: "Two factor code is required" });
      }
      if (!user.twoFactorSecret) {
        return res
          .status(400)
          .json({ message: "Two factor misconfigured for this account" });
      }
    }

    const accessToken = createAccessToken(
      Number(user.id),
      user.role,
      user.tokenVersion,
    );
    const refreshToken = createRefreshToken(Number(user.id), user.tokenVersion);

    const isProd = process.env.NODE_ENV === "production";
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
      },
      accessToken,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export async function refreshTokenHandler(req: Request, res: Response) {
  try {
    const token = req.cookies?.refreshToken as string | undefined;
    if (!token) {
      return res.status(401).json({ message: "Refresh token not found" });
    }

    const { sub, tokenVersion } = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: Number(sub) } });
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    if (user.tokenVersion !== tokenVersion) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = createAccessToken(
      Number(user.id),
      user.role,
      user.tokenVersion,
    );
    const newRefreshToken = createRefreshToken(
      Number(user.id),
      user.tokenVersion,
    );
    const isProd = process.env.NODE_ENV === "production";

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    return res.status(200).json({
      message: "Refresh token successful",
      accessToken: newAccessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function logoutHandler(req: Request, res: Response) {
  try {
    const token = req.cookies?.refreshToken as string | undefined;

    if (token) {
      const { sub } = verifyRefreshToken(token);

      await prisma.user.update({
        where: {
          id: Number(sub),
        },
        data: {
          tokenVersion: {
            increment: 1,
          },
        },
      });
    }

    res.clearCookie("refreshToken", {
      path: "/",
    });

    return res.status(200).json({
      message: "Logout successful",
    });
  } catch (error) {
    console.log(error);

    res.clearCookie("refreshToken", {
      path: "/",
    });

    return res.status(200).json({
      message: "Logout successful",
    });
  }
}

export async function forgotPasswordHandler(req: Request, res: Response) {
  try {
    const { email } = req.body as { email: string };
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!user.isEmailVerified) {
      return res.status(403).json({ message: "Please verify your email!" });
    }
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: tokenHash,
        resetPasswordTokenExpiry: tokenExpiry,
      },
    });

    const forgotPasswordUrl = `${getAppUrl()}/api/auth/reset-password?token=${rawToken}`;
    await sendEmail(
      user.email,
      "Forgot your password?",
      `
        <p>Forgot your password? Click here to reset it: <a href='${forgotPasswordUrl}'>Forgot password</a></p>
        `,
    );

    return res.status(200).json({
      message: "Forgot password email sent successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function resetPasswordHandler(req: Request, res: Response) {
  try {
    const { password, token } = req.body as {
      password?: string;
      token?: string;
    };
    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password is too short" });
    }
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: tokenHash,
        resetPasswordTokenExpiry: {
          gte: new Date(),
        },
      },
    });
    if (!user) {
      return res.status(404).json({ message: "Invalid or expired token" });
    }
    const isPasswordValid = await comparePassword(password, user.password);
    if (isPasswordValid) {
      return res.status(400).json({ message: "Password already used" });
    }
    const hashedPassword = await hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        tokenVersion: { increment: 1 },
        resetPasswordTokenExpiry: null,
      },
    });
    res.clearCookie("refreshToken");
    return res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function setup2FAHandler(req: Request, res: Response) {
  try {
    const authReq = req as any;
    const authUser = authReq.user;
    if (!authUser) {
      return res.status(401).json({ message: "Not Authenticated" });
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(authUser.id) },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const secret = generateSecret();
    const issuer = "Node Auth";
    const otpAuthUrl = generateURI({
      secret: secret,
      label: user.email,
      issuer,
    });
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: secret,
        twoFactorEnabled: false,
      },
    });
    return res.json({
      message: "2FA code sent successfully",
      otpAuthUrl,
      secret,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function verify2FAHandler(req: Request, res: Response) {
  try {
    const { code } = req.body as { code?: string };
    const authReq = req as any;
    const authUser = authReq.user;
    if (!authUser) {
      return res.status(401).json({ message: "Not Authenticated" });
    }

    if (!code) {
      return res.status(400).json({ message: "Code is required" });
    }
    const user = await prisma.user.findUnique({
      where: { id: Number(authUser.id) },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.twoFactorSecret) {
      return res.status(400).json({ message: "2FA not enabled" });
    }
    const isCodeValid = verify({ secret: user.twoFactorSecret, token: code });

    if (!isCodeValid) {
      return res.status(400).json({ message: "Invalid 2FA code" });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
      },
    });
    return res.status(200).json({
      message: "2FA code verified successfully",
      twoFactorEnabled: true,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
