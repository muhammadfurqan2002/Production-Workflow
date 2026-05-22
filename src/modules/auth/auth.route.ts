import { Router } from "express";
import {
  forgotPasswordHandler,
  loginHandler,
  logoutHandler,
  refreshTokenHandler,
  registerHandler,
  resetPasswordHandler,
  verifyEmail,
} from "./auth.controller";

const authRoutes = Router();

authRoutes.post("/register", registerHandler);
authRoutes.get("/verify-email", verifyEmail);
authRoutes.post("/login", loginHandler);
authRoutes.post("/refresh-token", refreshTokenHandler);
authRoutes.post("/logout", logoutHandler);
authRoutes.post("/forgot-password", forgotPasswordHandler);
authRoutes.post("/reset-password", resetPasswordHandler);
export default authRoutes;
