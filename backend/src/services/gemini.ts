import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Detection, GeminiComponent } from "../types.js";
import { STANDARD_KIT, mapToStandardType } from "./standardKit.js";

const STANDARD_TYPES = Object.keys(STANDARD_KIT).join(", ");

const SYSTEM_PROMPT = `You are a robotics inspection assistant. Identify ONLY components from the standard kit. Use these EXACT type names: ${STANDARD_TYPES}.

Rules:
1. Only report what you CLEARLY see. If unsure or blurry, skip it — do not guess.
2. Use the exact type names above (e.g. dc_motor, ultrasonic_sensor, ir_sensor, servo_motor).
3. Smart inference: 4 wheels = 2 DC motors (2 wheels per motor). 2 wheels = 2 DC motors. Infer motors from visible wheels when logical.
4. Keep names simple and consistent: "DC Motor", "Ultrasonic Sensor", "IR Sensor", "Servo Motor", "Arduino Uno", "Color Sensor", "9V Battery", etc.
5. Do NOT report camera or LIDAR — they are not in the kit.

Return JSON only, no markdown:
{
  "components": [
    { "type": "dc_motor", "name": "DC Motor", "count": 2 },
    { "type": "wheel", "name": "Wheel", "count": 4 }
  ]
}`;

export async function decodeComponents(
  detections: Detection[],
  apiKey: string
): Promise<GeminiComponent[]> {
  if (!apiKey) {
    return getMockComponents(detections);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const imageParts = detections
    .filter((d) => d.image_crop)
    .map((d) => ({
      inlineData: {
        data: String(d.image_crop),
        mimeType: "image/jpeg",
      },
    }));

  if (imageParts.length === 0) {
    return getMockComponents(detections);
  }

  const prompt = `Given these ${imageParts.length} cropped images from a robot inspection, identify each component.

${SYSTEM_PROMPT}`;

  try {
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        components: GeminiComponent[];
      };
      const raw = parsed.components ?? [];
      return normalizeToStandardKit(raw);
    }
  } catch (err) {
    console.error("Gemini error, falling back to mock:", err);
  }

  return getMockComponents(detections);
}

/** Normalize Gemini output to standard kit types and names. */
function normalizeToStandardKit(raw: GeminiComponent[]): GeminiComponent[] {
  const byType = new Map<string, { name: string; count: number }>();
  for (const c of raw) {
    const type = mapToStandardType(c.type) ?? c.type.toLowerCase().replace(/\s+/g, "_");
    if (!(type in STANDARD_KIT)) continue; // skip non-kit items (e.g. camera, lidar)
    const name = (STANDARD_KIT as Record<string, { name: string }>)[type]?.name ?? c.name;
    const existing = byType.get(type);
    if (existing) {
      existing.count += c.count;
    } else {
      byType.set(type, { name, count: c.count });
    }
  }
  return Array.from(byType.entries()).map(([type, { name, count }]) => ({
    type,
    name,
    count,
  }));
}

function getMockComponents(detections: Detection[]): GeminiComponent[] {
  const byType = new Map<string, { name: string; count: number }>();

  for (const d of detections) {
    const type = mapToStandardType(d.label) ?? d.label;
    if (!(type in STANDARD_KIT)) continue;
    const name = (STANDARD_KIT as Record<string, { name: string }>)[type]?.name ?? getComponentName(d.label);
    const existing = byType.get(type);
    if (existing) {
      existing.count += 1;
    } else {
      byType.set(type, { name, count: 1 });
    }
  }

  return Array.from(byType.entries()).map(([type, { name, count }]) => ({
    type,
    name,
    count,
  }));
}

function getComponentName(label: string): string {
  const names: Record<string, string> = {
    dc_motor: "DC Motor",
    servo_motor: "Servo Motor",
    ultrasonic_sensor: "Ultrasonic Sensor",
    ir_sensor: "IR Sensor",
    color_sensor: "Color Sensor",
    arduino_uno: "Arduino Uno",
    battery: "9V Battery",
    battery_holder: "9V Battery Holder",
    wheel: "Wheel",
    dc_motor_holder: "DC Motor Holder",
    dc_motor_drive: "DC Motor Drive",
    breadboard: "Breadboard",
    claw_arm: "Claw and Arm",
    laser_cut_base: "Laser Cut Base",
    wire: "Arduino Wire",
    screwdriver: "Screwdriver",
  };
  return names[label] ?? label;
}
