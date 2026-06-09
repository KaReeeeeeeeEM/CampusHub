import mongoose, { type Connection } from "mongoose";
import { MongoClient, type Db } from "mongodb";

type MongooseCache = {
  connection: Connection | null;
  promise: Promise<Connection> | null;
};

const globalForMongo = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
  mongoClient?: MongoClient;
};

const cache =
  globalForMongo.mongooseCache ??
  ({
    connection: null,
    promise: null,
  } satisfies MongooseCache);

if (!globalForMongo.mongooseCache) {
  globalForMongo.mongooseCache = cache;
}

function getMongoUri() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    if (process.env.APP_ENV === "production") {
      throw new Error(
        "MONGODB_URI is required to connect CampusHub to MongoDB.",
      );
    }

    return "mongodb://127.0.0.1:27017/campushub";
  }

  return uri;
}

export function getMongoDbName() {
  return process.env.MONGODB_DB_NAME || "campushub";
}

export async function connectMongo(): Promise<Connection> {
  if (cache.connection) {
    return cache.connection;
  }

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(getMongoUri(), {
        dbName: getMongoDbName(),
        bufferCommands: false,
      })
      .then((instance) => instance.connection);
  }

  cache.connection = await cache.promise;
  return cache.connection;
}

export async function getMongoDb(): Promise<Db> {
  const connection = await connectMongo();

  if (!connection.db) {
    throw new Error("MongoDB connection has not exposed a database handle.");
  }

  return connection.db;
}

export async function getMongoClient(): Promise<MongoClient> {
  const connection = await connectMongo();
  return connection.getClient();
}

export function getMongoNativeClient() {
  if (!globalForMongo.mongoClient) {
    globalForMongo.mongoClient = new MongoClient(getMongoUri());
  }

  return globalForMongo.mongoClient;
}

export function getMongoNativeDb() {
  return getMongoNativeClient().db(getMongoDbName());
}
