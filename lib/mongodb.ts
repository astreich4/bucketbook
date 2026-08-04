import "server-only";

import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is required. Add it to .env.local or the hosting provider's secret store.");
}

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

declare global {
  var bucketBookMongoClient: MongoClient | undefined;
}

export const mongoClient = global.bucketBookMongoClient ?? new MongoClient(uri, options);

if (process.env.NODE_ENV !== "production") {
  global.bucketBookMongoClient = mongoClient;
}

export const database = mongoClient.db(process.env.MONGODB_DB ?? "bucketbook");
