/**
 * Standard robotics kit for UTRahacks inspections.
 * Use these exact names for consistency — Gemini maps detected parts to these.
 */
export const STANDARD_KIT = {
  breadboard: { max: 1, name: "Breadboard" },
  battery: { max: 4, name: "9V Battery" },
  battery_holder: { max: 2, name: "9V Battery Holder" },
  ultrasonic_sensor: { max: 1, name: "Ultrasonic Sensor" },
  arduino_uno: { max: 1, name: "Arduino Uno (USB-C)" },
  wire: { max: 1, name: "Arduino Wire" },
  wheel: { max: 4, name: "Wheel" },
  dc_motor: { max: 2, name: "DC Motor" },
  dc_motor_holder: { max: 2, name: "DC Motor Holder" },
  dc_motor_drive: { max: 2, name: "DC Motor Drive" },
  screwdriver: { max: 1, name: "Screwdriver" },
  servo_motor: { max: 2, name: "Servo Motor" },
  color_sensor: { max: 1, name: "Color Sensor" },
  ir_sensor: { max: 2, name: "IR Sensor" },
  laser_cut_base: { max: 1, name: "Laser Cut Base" },
  claw_arm: { max: 1, name: "Claw and Arm" },
} as const;

export type StandardComponentType = keyof typeof STANDARD_KIT;

/** Banned components not in the standard kit. */
export const BANNED_COMPONENTS = ["camera", "lidar"] as const;

/** Maps Gemini/variable names to standard kit type. */
export function mapToStandardType(raw: string): StandardComponentType | null {
  const lower = raw.toLowerCase().replace(/\s+/g, "_");
  const aliases: Record<string, StandardComponentType> = {
    motor: "dc_motor",
    dc_motor: "dc_motor",
    "dc motor": "dc_motor",
    servo: "servo_motor",
    servo_motor: "servo_motor",
    ultrasonic: "ultrasonic_sensor",
    ultrasonic_sensor: "ultrasonic_sensor",
    ir: "ir_sensor",
    ir_sensor: "ir_sensor",
    color_sensor: "color_sensor",
    color: "color_sensor",
    arduino: "arduino_uno",
    arduino_uno: "arduino_uno",
    control_board: "arduino_uno",
    battery: "battery",
    battery_holder: "battery_holder",
    wheel: "wheel",
    wheels: "wheel",
    breadboard: "breadboard",
    claw: "claw_arm",
    claw_arm: "claw_arm",
    arm: "claw_arm",
    base: "laser_cut_base",
    laser_cut_base: "laser_cut_base",
    sensor: "ir_sensor", // generic sensor defaults to IR
  };
  return aliases[lower] ?? null;
}
