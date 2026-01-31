import type { InspectionRecord } from "../types.js";

const store = new Map<string, InspectionRecord>();

export function saveInspection(record: InspectionRecord): void {
  store.set(record.inspection_id, record);
}

export function getInspection(inspectionId: string): InspectionRecord | null {
  return store.get(inspectionId) ?? null;
}
