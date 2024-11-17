import Vector3 from "./vector3.js"

export default interface Vector2 {
  x: number
  y: number
}

export function create(x: number, y: number): Vector2 {
  return { x, y }
}

export function length(): number {
  return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2))
}

export function normalize(): void {
  const length = this.length()
  if (length != 0) {
    this.x /= length
    this.y /= length
  }
}

export function add(vector: Vector2): Vector2 {
  return { x: this.x + vector.x, y: this.y + vector.y }
}

export function toVector3(): Vector3 {
  return { x: this.x, y: this.y, z: 0 }
}
