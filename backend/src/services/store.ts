import type { InspectionRecord } from "../types.js";

const store = new Map<string, InspectionRecord>();

export function saveInspection(record: InspectionRecord): void {
  store.set(record.inspection_id, record);
}

export function getInspection(inspectionId: string): InspectionRecord | null {
  return store.get(inspectionId) ?? null;
}

/** All saved inspections, newest first (for bot security tracking / verified list). */
export function getAllInspections(): InspectionRecord[] {
  return Array.from(store.values()).sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
}
