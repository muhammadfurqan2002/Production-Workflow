import { Router } from "express";
import {
  forgotPasswordHandler,
  loginHandler,
  logoutHandler,
  refreshTokenHandler,
  registerHandler,
  verify2FAHandler,
  resetPasswordHandler,
  setup2FAHandler,
  verifyEmail,
} from "./auth.controller";
import { checkAuth } from "../../middleware/auth";

const authRoutes = Router();

authRoutes.post("/register", registerHandler);
authRoutes.get("/verify-email", verifyEmail);
authRoutes.post("/login", loginHandler);
authRoutes.post("/refresh-token", refreshTokenHandler);
authRoutes.post("/logout", logoutHandler);
authRoutes.post("/forgot-password", forgotPasswordHandler);
authRoutes.post("/reset-password", resetPasswordHandler);
authRoutes.post("/setup-2fa", checkAuth, setup2FAHandler);
authRoutes.post("/verify-2fa", checkAuth, verify2FAHandler);

export default authRoutes;
