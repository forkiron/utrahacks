export interface Detection {
  label: "motor" | "camera" | "lidar" | "control_board" | "battery" | "sensor";
  confidence: number;
  image_crop: string;
  bbox?: [number, number, number, number];
}

export interface GeminiComponent {
  type: string;
  name: string;
  count: number;
}

export interface RuleSet {
  max_motors: number;
  allowed_components: string[];
  banned_components: string[];
}

export interface RuleResult {
  status: "PASS" | "FAIL";
  violations: string[];
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
  timestamp: number;
}
