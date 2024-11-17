import { Vector3 } from "./vector3.js"

export type Vector2 = {
  x: number
  y: number
}

export function create(x: number, y: number): Vector2 {
  return { x, y }
}

export function length(vector: Vector2): number {
  return Math.sqrt(Math.pow(vector.x, 2) + Math.pow(vector.y, 2))
}

export function normalize(vector: Vector2): Vector2 {
  const l = length(vector)
  if (l === 0) {
    throw new Error("Cannot normalize a zero-length vector")
  }
  return { x: vector.x / l, y: vector.y / l }
}

export function add(vector: Vector2): Vector2 {
  return { x: vector.x + vector.x, y: vector.y + vector.y }
}

export function toVector3(vector: Vector2): Vector3 {
  return { x: vector.x, y: vector.y, z: 0 }
}
