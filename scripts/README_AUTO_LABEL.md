# Auto-Label from 360° Videos

**No manual labeling required** - automatically extract frames and bounding boxes from videos using background subtraction.

## Setup

```bash
# Install dependencies
pip install opencv-python numpy

# Or if you have conda:
conda install opencv numpy
```

## Recording Videos

**Key tips for best results:**

1. **Clean background** - Use white paper, plain table, or solid color background
2. **Good lighting** - Bright, even lighting (avoid shadows)
3. **Slow rotation** - Rotate object or camera slowly (10-20 seconds for 360°)
4. **Keep object centered** - Object should stay in frame
5. **One object per video** - Don't have multiple objects in frame

**Example setup:**
```
┌─────────────────┐
│  White Paper    │  ← Background
│                 │
│      [🔧]       │  ← Your component (motor/wheel/etc)
│                 │
└─────────────────┘
     ↑
   Camera
(rotate camera around object, or rotate object on turntable)
```

## Usage

### Extract frames from one video:

```bash
python scripts/auto_label_from_video.py videos/wheel.mp4 \
  --class-name wheel \
  --output-dir dataset/wheel
```

### Process all your components:

```bash
# Create videos directory first
mkdir -p videos

# Record videos: wheel.mp4, motor.mp4, breadboard.mp4, arduino.mp4, servo.mp4, sensor.mp4, battery.mp4, plate.mp4

# Then run for each:
python scripts/auto_label_from_video.py videos/wheel.mp4 --class-name wheel --output-dir dataset/wheel
python scripts/auto_label_from_video.py videos/motor.mp4 --class-name dc_motor --output-dir dataset/motor
python scripts/auto_label_from_video.py videos/breadboard.mp4 --class-name breadboard --output-dir dataset/breadboard
python scripts/auto_label_from_video.py videos/arduino.mp4 --class-name arduino_uno --output-dir dataset/arduino
python scripts/auto_label_from_video.py videos/servo.mp4 --class-name servo --output-dir dataset/servo
python scripts/auto_label_from_video.py videos/sensor.mp4 --class-name sensor --output-dir dataset/sensor
python scripts/auto_label_from_video.py videos/battery.mp4 --class-name battery --output-dir dataset/battery
python scripts/auto_label_from_video.py videos/plate.mp4 --class-name plate --output-dir dataset/plate
```

### Options:

```bash
--fps-sample 2      # Extract 1 frame every 2 seconds (default: 1)
--min-size 2000     # Minimum object area in pixels (default: 1000)
```

## Output

For each video, you get:
```
dataset/wheel/
├── images/
│   ├── wheel_0000.jpg
│   ├── wheel_0001.jpg
│   └── ...
└── labels/
    ├── wheel_0000.txt  (YOLO format: class_id center_x center_y width height)
    ├── wheel_0001.txt
    └── ...
```

## Next Steps

After extracting all frames:

1. **Verify labels** - Quickly check a few images to make sure boxes look good
2. **Merge dataset** - Combine all classes into one folder
3. **Upload to Roboflow** - Or use locally for training
4. **Train YOLOv8** - Either on Roboflow or locally

### Merge all classes:

```bash
mkdir -p dataset/all/images dataset/all/labels

# Copy all images and labels to one folder
cp dataset/*/images/* dataset/all/images/
cp dataset/*/labels/* dataset/all/labels/

# Count total
ls dataset/all/images/ | wc -l
```

## Troubleshooting

**"No object detected" on most frames:**
- Background might not be clean enough
- Try `--min-size 500` (lower threshold)
- Use brighter lighting

**Boxes too small/large:**
- Adjust `--min-size` parameter
- Object might be too close/far from camera
- Re-record with object at better distance

**Multiple boxes per frame:**
- Script picks largest contour (your object)
- Make sure background has no other moving objects
