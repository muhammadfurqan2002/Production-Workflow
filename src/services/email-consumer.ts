import "dotenv/config";
import { startEmailConsumer } from "../kafka/email-consumer";

async function main() {
  console.log("🚀 Email Consumer Starting...");
  try {
    await startEmailConsumer();
  } catch (error) {
    console.error("❌ Failed to start:", error);
    process.exit(1);
  }
}

main();

process.on("SIGINT", () => {
  console.log("Shutting down...");
  process.exit(0);
});
