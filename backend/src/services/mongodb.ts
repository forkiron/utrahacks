import { MongoClient, Db, Collection, Binary } from "mongodb";
import type { InspectionRecord } from "../types.js";

/** Extended inspection document with image storage */
export interface InspectionDocument extends InspectionRecord {
  _id: string;
  images: Binary[];
  created_at: Date;
}

let client: MongoClient | null = null;
let db: Db | null = null;
let inspectionsCollection: Collection<InspectionDocument> | null = null;

const DB_NAME = "utrahacks";
const COLLECTION_NAME = "inspections";

/**
 * Connect to MongoDB. Call this once at startup.
 * Uses MONGODB_URI from environment.
 */
export async function connectMongoDB(): Promise<void> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    console.warn("⚠️ MONGODB_URI not set – using in-memory fallback (data will not persist)");
    return;
  }

  try {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(DB_NAME);
    inspectionsCollection = db.collection<InspectionDocument>(COLLECTION_NAME);

    // Create indexes for efficient queries
    await inspectionsCollection.createIndex({ timestamp: -1 });
    await inspectionsCollection.createIndex({ robot_id: 1 });

    console.log("✅ Connected to MongoDB successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    throw error;
  }
}

/**
 * Close MongoDB connection gracefully.
 */
export async function closeMongoDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    inspectionsCollection = null;
    console.log("MongoDB connection closed");
  }
}

/**
 * Check if MongoDB is connected and available.
 */
export function isMongoConnected(): boolean {
  return inspectionsCollection !== null;
}

/**
 * Get the inspections collection (throws if not connected).
 */
export function getInspectionsCollection(): Collection<InspectionDocument> {
  if (!inspectionsCollection) {
    throw new Error("MongoDB not connected. Call connectMongoDB() first.");
  }
  return inspectionsCollection;
}

export { Binary };
