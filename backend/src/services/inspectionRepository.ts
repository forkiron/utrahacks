import { Binary } from "mongodb";
import type { InspectionRecord } from "../types.js";
import {
  isMongoConnected,
  getInspectionsCollection,
  type InspectionDocument,
} from "./mongodb.js";

// In-memory fallback store (used when MongoDB is not configured)
const memoryStore = new Map<string, InspectionRecord>();
const memoryImages = new Map<string, Buffer[]>();

/**
 * Save an inspection record with optional images.
 * Uses MongoDB if connected, otherwise falls back to in-memory storage.
 */
export async function saveInspection(
  record: InspectionRecord,
  images: Buffer[] = []
): Promise<void> {
  if (isMongoConnected()) {
    const collection = getInspectionsCollection();
    const doc: InspectionDocument = {
      ...record,
      _id: record.inspection_id,
      images: images.map((buf) => new Binary(buf)),
      created_at: new Date(),
    };
    await collection.replaceOne({ _id: doc._id }, doc, { upsert: true });
  } else {
    // Fallback to in-memory
    memoryStore.set(record.inspection_id, record);
    if (images.length > 0) {
      memoryImages.set(record.inspection_id, images);
    }
  }
}

/**
 * Get an inspection record by ID.
 */
export async function getInspection(
  inspectionId: string
): Promise<InspectionRecord | null> {
  if (isMongoConnected()) {
    const collection = getInspectionsCollection();
    const doc = await collection.findOne({ _id: inspectionId });
    if (!doc) return null;
    // Return without MongoDB-specific fields
    const { _id, images, created_at, ...record } = doc;
    return record as InspectionRecord;
  } else {
    return memoryStore.get(inspectionId) ?? null;
  }
}

/**
 * Get all inspections, sorted by timestamp (newest first).
 */
export async function getAllInspections(): Promise<InspectionRecord[]> {
  if (isMongoConnected()) {
    const collection = getInspectionsCollection();
    const docs = await collection.find({}).sort({ timestamp: -1 }).toArray();
    return docs.map((doc) => {
      const { _id, images, created_at, ...record } = doc;
      return record as InspectionRecord;
    });
  } else {
    return Array.from(memoryStore.values()).sort(
      (a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)
    );
  }
}

/**
 * Get a stored image for an inspection.
 * Returns the image buffer or null if not found.
 */
export async function getInspectionImage(
  inspectionId: string,
  index: number
): Promise<Buffer | null> {
  if (isMongoConnected()) {
    const collection = getInspectionsCollection();
    const doc = await collection.findOne(
      { _id: inspectionId },
      { projection: { images: 1 } }
    );
    if (!doc || !doc.images || index < 0 || index >= doc.images.length) {
      return null;
    }
    return Buffer.from(doc.images[index].buffer);
  } else {
    const images = memoryImages.get(inspectionId);
    if (!images || index < 0 || index >= images.length) {
      return null;
    }
    return images[index];
  }
}
