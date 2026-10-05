import "server-only";

import { setServers } from "node:dns/promises";
import { MongoClient, type Db } from "mongodb";

const mongoGlobal = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
};

/** Reuse one connection pool across requests and development hot reloads. */
export default async function dbConnect(): Promise<Db> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Set MONGODB_URI in .env.local before connecting to MongoDB.");
  }

  if (!mongoGlobal.mongoClientPromise) {
    // Optional workaround for resolvers that time out on Atlas TXT/SRV records.
    // This configures Node's promise-based DNS resolver for the whole process.
    const dnsServers = process.env.MONGODB_DNS_SERVERS?.split(",").map(server => server.trim()).filter(Boolean);
    if (dnsServers?.length) setServers(dnsServers);
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });

    mongoGlobal.mongoClientPromise = client.connect().catch(async (error: unknown) => {
      // A failed connection must not prevent later requests from retrying.
      mongoGlobal.mongoClientPromise = undefined;
      await client.close().catch(() => undefined);
      throw error;
    });
  }

  const client = await mongoGlobal.mongoClientPromise;
  return client.db(process.env.MONGODB_DB || "urbanforge");
}
