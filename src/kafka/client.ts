import { Kafka, Producer, logLevel } from "kafkajs";

const kafka = new Kafka({
  clientId: "auction-app",
  brokers: (process.env.KAFKA_BROKER || "localhost:9092").split(","),
  ssl: process.env.NODE_ENV === "production",
  sasl:
    process.env.NODE_ENV === "production"
      ? {
          mechanism: "plain",
          username: process.env.KAFKA_USERNAME!,
          password: process.env.KAFKA_PASSWORD!,
        }
      : undefined,
  logLevel: logLevel.ERROR,
});

let producer: Producer | null = null;

export async function getProducer() {
  if (!producer) {
    producer = kafka.producer({
      idempotent: true,
    });
    await producer.connect();
  }
  return producer;
}

export async function disconnectProducer() {
  if (producer) {
    await producer.disconnect();
    producer = null;
  }
}

export { kafka };
