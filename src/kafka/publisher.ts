import { getProducer } from "./client";
import { AuthEvent } from "./events";
import { randomUUID } from "crypto";

const AUTH_TOPIC = "auth-events";

export async function PublishAuthEvent(event: AuthEvent) {
  try {
    const producer = await getProducer();
    const key = event.userId ? String(event.userId) : event.email;
    await producer.send({
      topic: AUTH_TOPIC,
      messages: [
        {
          key,
          value: JSON.stringify(event),
          headers: {
            "event-type": event.eventType,
            "correlation-id": randomUUID(),
          },
        },
      ],
    });
    console.log(`Published event: ${event.eventType} with key ${key}`);
  } catch (error) {
    console.log("Error while publishing event ", error);
  }
}
