import crypto from "crypto";
import { MongoClient, ObjectId } from "mongodb";
import type { AuditTrail, AudioJob } from "../types.js";

type AuditTrailInput = Omit<AuditTrail, "_id" | "createdAt" | "updatedAt">;
type AudioJobInput = Omit<AudioJob, "_id" | "createdAt" | "updatedAt">;

const memoryAudit = new Map<string, AuditTrail>();
const memoryAudioJobs = new Map<string, AudioJob>();

let client: MongoClient | null = null;
let mongoReady = false;
let useMemory = false;

function getMongoUri(): string {
  return process.env.MONGODB_URI ?? "";
}

function getMongoDbName(): string {
  return process.env.MONGODB_DB ?? "utrahacks";
}

async function ensureMongo() {
  if (useMemory) return null;
  if (mongoReady) return client;
  const uri = getMongoUri().trim();
  if (!uri) {
    useMemory = true;
    return null;
  }
  client = new MongoClient(uri);
  await client.connect();
  mongoReady = true;
  return client;
}

function normalizeId(id: ObjectId | string | undefined): string | undefined {
  if (!id) return undefined;
  return typeof id === "string" ? id : id.toString();
}

function toDate(d: Date | string | number | undefined): Date {
  if (!d) return new Date();
  if (d instanceof Date) return d;
  return new Date(d);
}

async function getDb() {
  const connected = await ensureMongo();
  if (!connected) return null;
  return connected.db(getMongoDbName());
}

function toAuditTrail(doc: AuditTrail): AuditTrail {
  return {
    ...doc,
    _id: normalizeId(doc._id as unknown as ObjectId),
    createdAt: toDate(doc.createdAt),
    updatedAt: toDate(doc.updatedAt),
  };
}

function toAudioJob(doc: AudioJob): AudioJob {
  return {
    ...doc,
    _id: normalizeId(doc._id as unknown as ObjectId),
    createdAt: toDate(doc.createdAt),
    updatedAt: toDate(doc.updatedAt),
  };
}

export async function insertAuditTrail(input: AuditTrailInput): Promise<AuditTrail> {
  const now = new Date();
  const payload: AuditTrail = {
    ...input,
    createdAt: now,
    updatedAt: now,
  };

  const db = await getDb();
  if (!db) {
    const id = crypto.randomUUID();
    const stored = { ...payload, _id: id };
    memoryAudit.set(id, stored);
    return toAuditTrail(stored);
  }

  const collection = db.collection<AuditTrail>("audit_trails");
  const result = await collection.insertOne(payload);
  return toAuditTrail({ ...payload, _id: result.insertedId });
}

export async function updateAuditTrail(
  id: string,
  patch: Partial<AuditTrail>
): Promise<AuditTrail | null> {
  const now = new Date();
  const db = await getDb();
  if (!db) {
    const existing = memoryAudit.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, updatedAt: now };
    memoryAudit.set(id, updated);
    return toAuditTrail(updated);
  }

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return null;
  }
  const collection = db.collection<AuditTrail>("audit_trails");
  await collection.updateOne({ _id: objectId }, { $set: { ...patch, updatedAt: now } });
  const doc = await collection.findOne({ _id: objectId });
  return doc ? toAuditTrail(doc) : null;
}

export async function getAuditTrail(id: string): Promise<AuditTrail | null> {
  const db = await getDb();
  if (!db) {
    const doc = memoryAudit.get(id);
    return doc ? toAuditTrail(doc) : null;
  }

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return null;
  }
  const doc = await db.collection<AuditTrail>("audit_trails").findOne({ _id: objectId });
  return doc ? toAuditTrail(doc) : null;
}

export async function listAuditTrailsByRunId(runId: string): Promise<AuditTrail[]> {
  const db = await getDb();
  if (!db) {
    const list = Array.from(memoryAudit.values()).filter((item) => item.runId === runId);
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return list.map((item) => toAuditTrail(item));
  }

  const docs = await db
    .collection<AuditTrail>("audit_trails")
    .find({ runId })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map((doc) => toAuditTrail(doc));
}

export async function insertAudioJob(input: AudioJobInput): Promise<AudioJob> {
  const now = new Date();
  const payload: AudioJob = {
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  const db = await getDb();
  if (!db) {
    const id = crypto.randomUUID();
    const stored = { ...payload, _id: id };
    memoryAudioJobs.set(id, stored);
    return toAudioJob(stored);
  }

  const collection = db.collection<AudioJob>("audio_jobs");
  const result = await collection.insertOne(payload);
  return toAudioJob({ ...payload, _id: result.insertedId });
}

export async function updateAudioJob(
  id: string,
  patch: Partial<AudioJob>
): Promise<AudioJob | null> {
  const now = new Date();
  const db = await getDb();
  if (!db) {
    const existing = memoryAudioJobs.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, updatedAt: now };
    memoryAudioJobs.set(id, updated);
    return toAudioJob(updated);
  }

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return null;
  }
  const collection = db.collection<AudioJob>("audio_jobs");
  await collection.updateOne({ _id: objectId }, { $set: { ...patch, updatedAt: now } });
  const doc = await collection.findOne({ _id: objectId });
  return doc ? toAudioJob(doc) : null;
}

export async function getAudioJob(id: string): Promise<AudioJob | null> {
  const db = await getDb();
  if (!db) {
    const doc = memoryAudioJobs.get(id);
    return doc ? toAudioJob(doc) : null;
  }

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return null;
  }
  const doc = await db.collection<AudioJob>("audio_jobs").findOne({ _id: objectId });
  return doc ? toAudioJob(doc) : null;
}
