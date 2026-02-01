import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Detection, GeminiComponent } from "../types.js";

const SYSTEM_PROMPT = `You are a robotics inspection assistant.

For each cropped image provided:
1. Identify the component type (motor, camera, lidar, control_board, battery, sensor)
2. Name the specific part if possible (e.g. "TT Yellow DC Motor", "USB Camera Module")
3. State whether it is a camera, LIDAR, motor, controller, or sensor
4. Estimate count if duplicates appear in the crop

Return JSON only, no markdown. Format:
{
  "components": [
    { "type": "motor", "name": "TT Yellow DC Motor", "count": 2 },
    { "type": "camera", "name": "USB Camera Module", "count": 1 }
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
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const imageParts = detections.map((d) => ({
    inlineData: {
      data: d.image_crop,
      mimeType: "image/jpeg",
    },
  }));

  const prompt = `Given these ${detections.length} cropped images from a robot inspection, identify each component.

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
      return parsed.components ?? [];
    }
  } catch (err) {
    console.error("Gemini error, falling back to mock:", err);
  }

  return getMockComponents(detections);
}

function getMockComponents(detections: Detection[]): GeminiComponent[] {
  const byType = new Map<string, { name: string; count: number }>();

  for (const d of detections) {
    const existing = byType.get(d.label);
    const name = getComponentName(d.label);
    if (existing) {
      existing.count += 1;
    } else {
      byType.set(d.label, { name, count: 1 });
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
    motor: "DC Motor",
    camera: "Camera Module",
    lidar: "LIDAR Sensor",
    control_board: "Control Board",
    battery: "Li-ion Battery",
    sensor: "IR/Ultrasonic Sensor",
  };
  return names[label] ?? label;
}
