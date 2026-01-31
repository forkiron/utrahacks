import sharp from "sharp";
import type { Detection } from "../types.js";

const COMPONENT_LABELS = [
  "motor",
  "camera",
  "lidar",
  "control_board",
  "battery",
  "sensor",
] as const;

export interface CvLayerInput {
  imageBuffer: Buffer;
  imageIndex: number;
}

/**
 * CV Layer - Object detection for robot components.
 * Currently uses heuristic mock; swap in YOLOv8/OpenCV for production.
 */
export async function runObjectDetection(
  imageBuffers: Buffer[]
): Promise<Detection[]> {
  const allDetections: Detection[] = [];

  for (let i = 0; i < imageBuffers.length; i++) {
    const buffer = imageBuffers[i];
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width ?? 640;
    const height = metadata.height ?? 480;

    // Mock detection: simulate 1-3 components per image based on position
    // In production, replace with YOLOv8 inference
    const mockLabels = getMockLabelsForImage(i, imageBuffers.length);
    for (let j = 0; j < mockLabels.length; j++) {
      const label = mockLabels[j];
      const x = Math.floor((j * 0.25 + 0.1) * width);
      const y = Math.floor(0.2 * height);
      const w = Math.floor(0.3 * width);
      const h = Math.floor(0.4 * height);

      const crop = await sharp(buffer)
        .extract({ left: x, top: y, width: w, height: h })
        .jpeg({ quality: 85 })
        .toBuffer();

      allDetections.push({
        label: label as Detection["label"],
        confidence: 0.85 + Math.random() * 0.1,
        image_crop: crop.toString("base64"),
        bbox: [x, y, w, h],
      });
    }
  }

  return allDetections;
}

function getMockLabelsForImage(
  imageIndex: number,
  totalImages: number
): (typeof COMPONENT_LABELS)[number][] {
  // Vary detections per "view" - front, back, top, side
  const presets: (typeof COMPONENT_LABELS)[number][][] = [
    ["motor", "control_board"],
    ["motor", "sensor"],
    ["battery", "control_board"],
    ["sensor", "motor"],
    ["camera", "lidar", "motor"],
  ];
  return presets[imageIndex % presets.length] ?? ["motor", "sensor"];
}
