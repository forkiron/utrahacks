#!/usr/bin/env python3
"""
Auto-label objects from 360° videos using background subtraction.
No manual labeling needed - just record video of object on clean background.

Usage:
    python auto_label_from_video.py videos/wheel.mp4 --class-name wheel --output-dir dataset/wheel
    python auto_label_from_video.py videos/motor.mp4 --class-name dc_motor --output-dir dataset/motor

Requirements:
    pip install opencv-python numpy
"""

import argparse
import os
import re
from pathlib import Path

import cv2
import numpy as np


def get_next_start_index(images_dir, class_name):
    """Find next available index so multiple videos can append to same dataset."""
    images_dir = Path(images_dir)
    if not images_dir.exists():
        return 0
    pattern = re.compile(rf"{re.escape(class_name)}_(\d+)\.jpg", re.IGNORECASE)
    max_idx = -1
    for f in images_dir.iterdir():
        m = pattern.match(f.name)
        if m:
            max_idx = max(max_idx, int(m.group(1)))
    return max_idx + 1


def extract_and_label_frames(video_path, class_name, output_dir, fps_sample=1, min_object_size=1000, start_index=None):
    """
    Extract frames from video and auto-generate YOLO labels using background subtraction.
    
    Args:
        video_path: Path to input video
        class_name: Class name for this object (e.g. 'wheel', 'dc_motor')
        output_dir: Output directory for images and labels
        fps_sample: Extract 1 frame per N seconds
        min_object_size: Minimum contour area to consider as object
        start_index: First frame index (default: auto-detect from existing images to append)
    """
    # Create output directories
    output_dir = Path(output_dir)
    images_dir = output_dir / "images"
    labels_dir = output_dir / "labels"
    images_dir.mkdir(parents=True, exist_ok=True)
    labels_dir.mkdir(parents=True, exist_ok=True)
    
    if start_index is None:
        start_index = get_next_start_index(images_dir, class_name)
    saved_count = start_index
    
    # Open video
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        print(f"Error: Could not open video {video_path}")
        return
    
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    frame_interval = fps * fps_sample
    frame_count = 0
    initial_count = saved_count
    
    # Background subtractor (MOG2 works well for stationary camera)
    bg_subtractor = cv2.createBackgroundSubtractorMOG2(
        history=500,
        varThreshold=16,
        detectShadows=True
    )
    
    print(f"Processing video: {video_path}")
    print(f"Extracting 1 frame every {fps_sample} second(s)")
    print(f"Class: {class_name}")
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        frame_count += 1
        
        # Apply background subtraction to every frame (helps learn background)
        fg_mask = bg_subtractor.apply(frame)
        
        # Only save every Nth frame
        if frame_count % frame_interval != 0:
            continue
        
        # Apply morphological operations to clean up mask
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel)
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel)
        
        # Remove shadows (they're marked as 127 in MOG2)
        fg_mask[fg_mask == 127] = 0
        
        # Find contours (connected components = potential objects)
        contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            print(f"  Frame {frame_count}: No object detected (skip)")
            continue
        
        # Find largest contour (assume that's our object)
        largest_contour = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(largest_contour)
        
        if area < min_object_size:
            print(f"  Frame {frame_count}: Object too small (area={area}, skip)")
            continue
        
        # Get bounding box from contour
        x, y, w, h = cv2.boundingRect(largest_contour)
        img_h, img_w = frame.shape[:2]
        
        # Convert to YOLO format (normalized center x, center y, width, height)
        center_x = (x + w / 2) / img_w
        center_y = (y + h / 2) / img_h
        norm_w = w / img_w
        norm_h = h / img_h
        
        # Skip if box is too small or too large (likely noise or full frame)
        if norm_w < 0.05 or norm_h < 0.05 or norm_w > 0.95 or norm_h > 0.95:
            print(f"  Frame {frame_count}: Box size invalid (skip)")
            continue
        
        # Save image
        img_filename = f"{class_name}_{saved_count:04d}.jpg"
        img_path = images_dir / img_filename
        cv2.imwrite(str(img_path), frame)
        
        # Save YOLO label (class_id center_x center_y width height)
        # Using class_id=0 for now (you'll map class names to IDs later)
        label_filename = f"{class_name}_{saved_count:04d}.txt"
        label_path = labels_dir / label_filename
        with open(label_path, 'w') as f:
            f.write(f"0 {center_x:.6f} {center_y:.6f} {norm_w:.6f} {norm_h:.6f}\n")
        
        saved_count += 1
        print(f"  Frame {frame_count}: Saved {img_filename} (bbox: {x},{y},{w},{h})")
    
    cap.release()
    new_frames = saved_count - initial_count
    print(f"\nDone! Saved {new_frames} new frames (total in dataset: {saved_count}) to {output_dir}")
    print(f"  Images: {images_dir}")
    print(f"  Labels: {labels_dir}")
    return saved_count


def main():
    parser = argparse.ArgumentParser(description="Auto-label objects from 360° videos")
    parser.add_argument("video", help="Path to input video file")
    parser.add_argument("--class-name", required=True, help="Class name (e.g. wheel, dc_motor)")
    parser.add_argument("--output-dir", required=True, help="Output directory for dataset")
    parser.add_argument("--fps-sample", type=int, default=1, help="Extract 1 frame per N seconds (default: 1)")
    parser.add_argument("--min-size", type=int, default=1000, help="Minimum object area in pixels (default: 1000)")
    parser.add_argument("--start-index", type=int, default=None, help="First frame index (default: auto-append to existing dataset)")
    
    args = parser.parse_args()
    
    extract_and_label_frames(
        video_path=args.video,
        class_name=args.class_name,
        output_dir=args.output_dir,
        fps_sample=args.fps_sample,
        min_object_size=args.min_size,
        start_index=args.start_index
    )


if __name__ == "__main__":
    main()
