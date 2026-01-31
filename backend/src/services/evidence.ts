import { createHash } from "node:crypto";
import type { EvidenceBundle, GeminiComponent } from "../types.js";

export function createEvidenceBundle(
  inspectionId: string,
  robotId: string,
  result: "PASS" | "FAIL",
  violations: string[],
  components: GeminiComponent[],
  imageHash: string,
  analysisHash: string
): EvidenceBundle {
  const bundle: EvidenceBundle = {
    inspection_id: inspectionId,
    robot_id: robotId,
    result,
    violations,
    components,
    image_hash: imageHash,
    analysis_hash: analysisHash,
    rule_version: "2026.1",
    timestamp: Math.floor(Date.now() / 1000),
  };

  return bundle;
}

export function hashBuffer(buffer: Buffer): string {
  return "0x" + createHash("sha256").update(buffer).digest("hex");
}

export function hashObject(obj: unknown): string {
  const str = JSON.stringify(obj, Object.keys(obj as object).sort());
  return "0x" + createHash("sha256").update(str).digest("hex");
}

export function getBundleHash(bundle: EvidenceBundle): string {
  return hashObject(bundle);
}
