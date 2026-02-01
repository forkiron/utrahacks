export interface Detection {
  label: string;
  confidence: number;
  bbox?: [number, number, number, number];
  image_crop?: unknown;
}

export interface GeminiComponent {
  type: string;
  name: string;
  count: number;
}

export interface EvidenceBundle {
  inspection_id: string;
  robot_id: string;
  result: "PASS" | "FAIL";
  violations: string[];
  components: GeminiComponent[];
  image_hash: string;
  analysis_hash: string;
  rule_version: string;
  timestamp: number;
}

export interface InspectionRecord {
  inspection_id: string;
  robot_id: string;
  result: "PASS" | "FAIL";
  violations: string[];
  components: GeminiComponent[];
  evidence_hash: string;
  judge_wallet?: string;
  solana_tx?: string;
  /** If true, the on-chain memo is encrypted (AES-256-GCM). */
  encrypted_on_chain?: boolean;
  /** Number of evidence images stored for this inspection (0..image_count-1). */
  image_count?: number;
  timestamp: number;
}

export interface RuleSet {
  max_motors: number;
  max_servos?: number;
  allowed_components: string[];
  banned_components: string[];
}

export interface RuleResult {
  status: "PASS" | "FAIL";
  violations: string[];
}

export type AuditTrailStatus = "queued" | "processing" | "done" | "failed";
export type AuditTrailSourceType =
  | "judge_audio"
  | "team_audio"
  | "coach_audio"
  | "uploaded_video_audio";

export interface TranscriptSegment {
  startMs: number;
  endMs: number;
  text: string;
}

export interface AuditTrail {
  _id?: string;
  runId: string;
  sourceType: AuditTrailSourceType;
  status: AuditTrailStatus;
  language?: string;
  transcriptText?: string;
  transcriptSegments?: TranscriptSegment[];
  confidence?: number;
  mock: boolean;
  createdAt: Date;
  updatedAt: Date;
  error?: string;
  tags?: string[];
  media?: { mimeType: string; sizeBytes: number; sha256: string };
}

export type AudioJobStatus = "queued" | "processing" | "done" | "failed";
export type AudioJobType = "tts" | "sfx" | "dub";

export interface AudioJob {
  _id?: string;
  jobType: AudioJobType;
  status: AudioJobStatus;
  language?: string;
  voiceProfile?: string;
  inputText?: string;
  inputMeta?: unknown;
  output?: { mimeType: string; audioBase64: string };
  mock: boolean;
  createdAt: Date;
  updatedAt: Date;
  error?: string;
  tags?: string[];
}
