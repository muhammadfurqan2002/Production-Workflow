import dotenv from "dotenv";
import app from "./app";
import http from "http";
dotenv.config();



async function startServer() {
    const server = http.createServer(app);
    server.listen(process.env.PORT, () => {
        console.log(`Server is running on port ${process.env.PORT}`);
    });
}

startServer().catch((error) => {
    console.log("Failed to start server",error);
    process.exit(1);
});