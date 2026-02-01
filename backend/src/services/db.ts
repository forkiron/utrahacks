import crypto from "crypto";
import type { AuditTrail, AudioJob } from "../types.js";

type AuditTrailInput = Omit<AuditTrail, "_id" | "createdAt" | "updatedAt">;
type AudioJobInput = Omit<AudioJob, "_id" | "createdAt" | "updatedAt">;

const memoryAudit = new Map<string, AuditTrail & { _id: string }>();
const memoryAudioJobs = new Map<string, AudioJob & { _id: string }>();

function toDate(d: Date | string | number | undefined): Date {
  if (!d) return new Date();
  if (d instanceof Date) return d;
  return new Date(d);
}

function toAuditTrail(doc: AuditTrail & { _id: string }): AuditTrail {
  return {
    ...doc,
    _id: doc._id,
    createdAt: toDate(doc.createdAt),
    updatedAt: toDate(doc.updatedAt),
  };
}

function toAudioJob(doc: AudioJob & { _id: string }): AudioJob {
  return {
    ...doc,
    _id: doc._id,
    createdAt: toDate(doc.createdAt),
    updatedAt: toDate(doc.updatedAt),
  };
}

export async function insertAuditTrail(input: AuditTrailInput): Promise<AuditTrail> {
  const now = new Date();
  const id = crypto.randomUUID();
  const payload: AuditTrail & { _id: string } = {
    ...input,
    _id: id,
    createdAt: now,
    updatedAt: now,
  };
  memoryAudit.set(id, payload);
  return toAuditTrail(payload);
}

export async function updateAuditTrail(
  id: string,
  patch: Partial<AuditTrail>
): Promise<AuditTrail | null> {
  const now = new Date();
  const existing = memoryAudit.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, updatedAt: now };
  memoryAudit.set(id, updated);
  return toAuditTrail(updated);
}

export async function getAuditTrail(id: string): Promise<AuditTrail | null> {
  const doc = memoryAudit.get(id);
  return doc ? toAuditTrail(doc) : null;
}

export async function listAuditTrailsByRunId(runId: string): Promise<AuditTrail[]> {
  const list = Array.from(memoryAudit.values()).filter((item) => item.runId === runId);
  list.sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime());
  return list.map((item) => toAuditTrail(item));
}

export async function insertAudioJob(input: AudioJobInput): Promise<AudioJob> {
  const now = new Date();
  const id = crypto.randomUUID();
  const payload: AudioJob & { _id: string } = {
    ...input,
    _id: id,
    createdAt: now,
    updatedAt: now,
  };
  memoryAudioJobs.set(id, payload);
  return toAudioJob(payload);
}

export async function updateAudioJob(
  id: string,
  patch: Partial<AudioJob>
): Promise<AudioJob | null> {
  const now = new Date();
  const existing = memoryAudioJobs.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, updatedAt: now };
  memoryAudioJobs.set(id, updated);
  return toAudioJob(updated);
}

export async function getAudioJob(id: string): Promise<AudioJob | null> {
  const doc = memoryAudioJobs.get(id);
  return doc ? toAudioJob(doc) : null;
}
