import { Router } from "express";
import { loginHandler, registerHandler, verifyEmail } from "./auth.controller";

const authRoutes = Router();

authRoutes.post("/register", registerHandler);
authRoutes.get("/verify-email", verifyEmail);
authRoutes.post("/login", loginHandler);

export default authRoutes;
