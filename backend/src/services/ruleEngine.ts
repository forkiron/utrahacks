import type { GeminiComponent, RuleResult, RuleSet } from "../types.js";

const DEFAULT_RULES: RuleSet = {
  max_motors: 2,
  allowed_components: [
    "motor",
    "ultrasonic",
    "ir",
    "sensor",
    "battery",
    "control_board",
  ],
  banned_components: ["camera", "lidar"],
};

export function evaluateRules(
  components: GeminiComponent[],
  rules: RuleSet = DEFAULT_RULES
): RuleResult {
  const violations: string[] = [];

  const byType = new Map<string, number>();
  for (const c of components) {
    const type = c.type.toLowerCase().replace(/\s+/g, "_");
    const normalized = mapToRuleType(type);
    byType.set(normalized, (byType.get(normalized) ?? 0) + c.count);
  }

  // Check banned components
  for (const banned of rules.banned_components) {
    const count = byType.get(banned) ?? 0;
    if (count > 0) {
      violations.push(
        `${banned} detected (${count}) — ${banned}s are not allowed`
      );
    }
  }

  // Check motor limit
  const motorCount = byType.get("motor") ?? 0;
  if (motorCount > rules.max_motors) {
    violations.push(
      `Motor limit exceeded: ${motorCount} motors (max ${rules.max_motors})`
    );
  }

  return {
    status: violations.length === 0 ? "PASS" : "FAIL",
    violations,
  };
}

function mapToRuleType(type: string): string {
  const map: Record<string, string> = {
    camera: "camera",
    lidar: "lidar",
    motor: "motor",
    ultrasonic: "ultrasonic",
    ir: "ir",
    sensor: "sensor",
    control_board: "control_board",
    battery: "battery",
  };
  return map[type] ?? type;
}
