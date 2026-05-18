import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import authRoutes from "./modules/auth/auth.route";
dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => {
    res.json({ status: "ok", message: "App is running" })
});

app.use("/api/auth", authRoutes);



export default app;
