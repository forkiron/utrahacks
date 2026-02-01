#!/usr/bin/env python3
"""
Run trained wheel YOLO model on an image; print JSON detections to stdout.
Used by backend for live /detect-wheel.

Usage:
    python scripts/run_wheel_detect.py /path/to/image.jpg [model.pt]
Output (stdout):
    [{"label":"wheel","confidence":0.95,"bbox":[x,y,w,h]}, ...]
bbox = [left, top, width, height] in pixels.
"""

import argparse
import json
import sys
from pathlib import Path

# Project root (parent of scripts/)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MODEL = PROJECT_ROOT / "runs" / "detect" / "wheel" / "weights" / "best.pt"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("image", help="Path to image file")
    parser.add_argument("model", nargs="?", default=str(DEFAULT_MODEL), help="Path to best.pt")
    parser.add_argument("--conf", type=float, default=0.08, help="Min confidence 0–1 (default 0.08, good enough for demo)")
    args = parser.parse_args()

    image_path = Path(args.image)
    if not image_path.exists():
        print(json.dumps([]), file=sys.stderr)
        sys.exit(1)
    model_path = Path(args.model)
    if not model_path.exists():
        print(json.dumps([]), file=sys.stderr)
        sys.exit(1)

    from ultralytics import YOLO
    model = YOLO(str(model_path))
    conf = max(0.01, min(0.99, args.conf))
    results = model.predict(str(image_path), conf=conf, verbose=False)

    out = []
    if results and len(results) > 0:
        r = results[0]
        if r.boxes is not None:
            xyxy = r.boxes.xyxy.cpu().numpy()
            conf = r.boxes.conf.cpu().numpy()
            for i in range(len(xyxy)):
                x1, y1, x2, y2 = xyxy[i]
                left, top = float(x1), float(y1)
                w, h = float(x2 - x1), float(y2 - y1)
                out.append({
                    "label": "wheel",
                    "confidence": float(conf[i]),
                    "bbox": [round(left), round(top), round(w), round(h)],
                })
            # Top 5 by confidence — good enough for hackathon demo, keeps overlay clean
            out.sort(key=lambda x: -x["confidence"])
            out = out[:5]
    print(json.dumps(out))


if __name__ == "__main__":
    main()
