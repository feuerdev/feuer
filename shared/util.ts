import Vector2 from "./vector2";

export interface Hashtable<T> {
  [key: string]:T;
}

export function scale(value: number, oldmin: number, oldmax: number, newmin: number, newmax: number): number {
  return (((newmax - newmin) * (value - oldmin)) / (oldmax - oldmin)) + newmin;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(Math.min(value, max), min);
}

export function mod(value: number, divider: number): number {
  return ((value % divider) + divider) % divider;
}

export function degreeToRadians(angle: number): number {
  return angle * Math.PI / 180
}
export function radiansToDegrees(angle: number): number {
  return angle * 180 / Math.PI;
}

export function calculateVerticalAngle(from: Vector2, to: Vector2, gravity: number, velocity: number): number {
  const d = new Vector2(from, to).length();
  const g = -gravity;
  const v = velocity;
  let result = radiansToDegrees(Math.asin(d * g / (Math.pow(v, 2))) / 2);
  if (Number.isNaN(result)) {
    result = 45;
  }
  return result;
}

export function calculateHorizontalAngle(from: Vector2, to: Vector2, orientation: number): number {
  let result = radiansToDegrees(Math.atan2(to.y - from.y, to.x - from.x)) - orientation;
  if (result < -180) { //Das verstehe ich nicht ganz
    result += 360;
  }
  return result;
}

export function calculateAimpoint(from: Vector2, angleHorizontal: number, angleVertical: number, orientation:number, gravity: number, velocity: number): Vector2 {
  const d = (Math.pow(velocity, 2) / -gravity)*Math.sin(2*degreeToRadians(angleVertical));
  const angle = angleHorizontal+orientation;
  const vec: Vector2 = new Vector2(d * Math.cos(degreeToRadians(angle)), d * Math.sin(degreeToRadians(angle)));
  const result: Vector2 = vec.add(from);
  return result;
}

export function aVerySlowFunction(milliseconds:number) {
  let now = Date.now();
  while(Date.now() < now+milliseconds ) {};
}