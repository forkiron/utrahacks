import type { GeminiComponent, RuleResult, RuleSet } from "../types.js";
import { mapToStandardType } from "./standardKit.js";

const DEFAULT_RULES: RuleSet = {
  max_motors: 2,
  max_servos: 2,
  allowed_components: [
    "breadboard",
    "battery",
    "battery_holder",
    "ultrasonic_sensor",
    "arduino_uno",
    "wire",
    "wheel",
    "dc_motor",
    "dc_motor_holder",
    "dc_motor_drive",
    "screwdriver",
    "servo_motor",
    "color_sensor",
    "ir_sensor",
    "laser_cut_base",
    "claw_arm",
  ],
  banned_components: ["camera", "lidar"],
};

export function evaluateRules(
  components: GeminiComponent[],
  rules: RuleSet = DEFAULT_RULES
): RuleResult {
  const violations: string[] = [];

  if (!components?.length) {
    violations.push("No components detected — inspection cannot pass");
    return { status: "FAIL", violations };
  }

  const byType = new Map<string, number>();
  for (const c of components) {
    const type = mapToStandardType(c.type) ?? c.type.toLowerCase().replace(/\s+/g, "_");
    byType.set(type, (byType.get(type) ?? 0) + c.count);
  }

  // Check banned components
  for (const banned of rules.banned_components) {
    const count = byType.get(banned) ?? 0;
    if (count > 0) {
      violations.push(
        `${banned} detected (${count}) — not in standard kit`
      );
    }
  }

  // Check DC motor limit (max 2)
  const dcMotorCount = (byType.get("dc_motor") ?? 0) + (byType.get("motor") ?? 0);
  if (dcMotorCount > rules.max_motors) {
    violations.push(
      `DC motor limit exceeded: ${dcMotorCount} (max ${rules.max_motors})`
    );
  }

  // Check servo limit (max 2)
  const servoCount = byType.get("servo_motor") ?? byType.get("servo") ?? 0;
  const maxServos = rules.max_servos ?? 2;
  if (servoCount > maxServos) {
    violations.push(
      `Servo limit exceeded: ${servoCount} (max ${maxServos})`
    );
  }

  return {
    status: violations.length === 0 ? "PASS" : "FAIL",
    violations,
  };
}
