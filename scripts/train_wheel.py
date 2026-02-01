#!/usr/bin/env python3
"""
Train YOLOv8 on the wheel dataset (single class).
Run from project root: python scripts/train_wheel.py

Requirements:
    pip install ultralytics
"""

from pathlib import Path
from ultralytics import YOLO

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_YAML = PROJECT_ROOT / "dataset" / "wheel" / "data.yaml"
RUNS_DIR = PROJECT_ROOT / "runs" / "detect"


def main():
    if not DATA_YAML.exists():
        print(f"Missing {DATA_YAML}. Run auto_label first.")
        return
    print(f"Dataset: {DATA_YAML}")
    print("Loading YOLOv8 nano (fast training)...")
    model = YOLO("yolov8n.pt")
    # 35 epochs = decent for hackathon (~10–12 min on CPU). More epochs = higher confidence, fewer false positives.
    print("Training wheel detector (35 epochs, imgsz=640) — ~10 min on CPU...")
    results = model.train(
        data=str(DATA_YAML),
        epochs=35,
        imgsz=640,
        batch=8,
        project=str(RUNS_DIR),
        name="wheel",
        exist_ok=True,
    )
    print(f"Done. Best weights: {results.save_dir}/weights/best.pt")


if __name__ == "__main__":
    main()
