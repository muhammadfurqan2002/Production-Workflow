import { sendEmail } from "../lib/email";
import { kafka } from "./client";
import { AuthEventType } from "./events";

export async function startEmailConsumer() {
  const consumer = kafka.consumer({ groupId: "auth-service" });
  await consumer.connect();
  await consumer.subscribe({ topic: "auth-events" });

  console.log("[Email Consumer] Started");

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const event = JSON.parse(message.value?.toString() || "{}");
        console.log(`[EMAIL CONSUMER] Processing: ${event.eventType}`);
        switch (event.eventType) {
          case AuthEventType.USER_REGISTERED:
            await sendEmail(
              event.email,
              "Welcome",
              `<h1>Welcome ${event.name}</h1><p>Th</p>`,
            );
            console.log(
              `[EMAIL CONSUMER] Sent verification email to ${event.email}`,
            );
            break;
          case AuthEventType.USER_VERIFICATION_EMAIL:
            await sendEmail(
              event.email,
              "User Verification",
              `<h1>Verify Your Email</h1><p>Click the link to verify your email</p><a href="${event.appUrl}">Verify Email</a>`,
            );
            console.log(
              `[EMAIL CONSUMER] Sent verification email to ${event.email}`,
            );
            break;
          default:
            console.log(
              `[EMAIL CONSUMER] Unknown event type: ${event.eventType}`,
            );
        }
      } catch (error) {
        console.log("[EMAIL CONSUMER] Error processing message", error);
      }
    },
  });
}
