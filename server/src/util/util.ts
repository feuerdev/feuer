export function scale(value: number, oldmin:number, oldmax:number, newmin:number, newmax:number): number {
  return (((newmax - newmin) * (value - oldmin)) / (oldmax - oldmin)) + newmin;
}

export function clamp(value:number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function mod(value: number, divider:number): number {
  return ((value%divider)+divider)%divider;
}