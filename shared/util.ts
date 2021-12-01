import Vector2 from "./vector2"

export interface Hashtable<T> {
  [key: string]: T
}

export function union(list1: any[], list2: any[]): any[] {
  let result = list1.concat(list2)
  result = result.filter((item, pos) => result.indexOf(item) === pos)
  return result
}

export function scale(
  value: number,
  oldmin: number,
  oldmax: number,
  newmin: number,
  newmax: number
): number {
  return ((newmax - newmin) * (value - oldmin)) / (oldmax - oldmin) + newmin
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(Math.min(value, max), min)
}

export function mod(value: number, divider: number): number {
  return ((value % divider) + divider) % divider
}

export function degreeToRadians(angle: number): number {
  return (angle * Math.PI) / 180
}
export function radiansToDegrees(angle: number): number {
  return (angle * 180) / Math.PI
}

export function isPointInRectangle(
  pointX,
  pointY,
  rectX,
  rectY,
  rectWidth,
  rectHeight
) {
  if (pointX > rectX && pointX < rectX + rectWidth) {
    if (pointY > rectY && pointY < rectY + rectHeight) {
      return true
    }
  }
  return false
}
