export function scale(value: number, oldmin:number, oldmax:number, newmin:number, newmax:number): number {
  return (((newmax - newmin) * (value - oldmin)) / (oldmax - oldmin)) + newmin;
}

export function clamp(value:number, min: number, max: number): number {
  return Math.max(Math.min(value, max), min);
}

export function mod(value: number, divider:number): number {
  return ((value%divider)+divider)%divider;
}

export function degreeToRadians(angle:number):number {
  return angle * Math.PI / 180
}
export function radiansToDegrees(angle: number): number {
  return angle * 180 / Math.PI;
}
