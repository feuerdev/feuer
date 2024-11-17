export type Vector3 = {
  x: number
  y: number
  z: number
}

export function length(vector: Vector3): number {
  return Math.sqrt(
    Math.pow(vector.x, 2) + Math.pow(vector.y, 2) + Math.pow(vector.z, 2)
  )
}

export function normalize(vector: Vector3): Vector3 {
  const l = length(vector)
  if (l === 0) {
    throw new Error("Cannot normalize a zero-length vector")
  }
  return {
    x: vector.x / l,
    y: vector.y / l,
    z: vector.z / l,
  }
}

export function add(vector: Vector3): Vector3 {
  return {
    x: vector.x + vector.x,
    y: vector.y + vector.y,
    z: vector.z + vector.z,
  }
}

export function multiply(vector: Vector3, factor: number): Vector3 {
  return { x: vector.x * factor, y: vector.y * factor, z: vector.z * factor }
}
