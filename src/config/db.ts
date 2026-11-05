import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is missing in environment variables");
}

export const client = new MongoClient(uri);

let db: Db;

export const connectDB = async (): Promise<Db> => {
  try {
    await client.connect();

    db = client.db("booknook");

    console.log("MongoDB connected successfully!");

    return db;
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
};

export const getDB = (): Db => {
  if (!db) {
    throw new Error("Database is not connected yet!");
  }

  return db;
};