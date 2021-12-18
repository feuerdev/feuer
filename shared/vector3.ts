export default interface Vector3 {
  x: number
  y: number
  z: number
}

export function length(): number {
  return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2) + Math.pow(this.z, 2))
}

export function normalize(): void {
  const length = this.length()
  if (length != 0) {
    this.x /= length
    this.y /= length
    this.z /= length
  }
}

export function add(vector: Vector3): Vector3 {
  return {
    x: this.x + vector.x,
    y: this.y + vector.y,
    z: this.z + vector.z,
  }
}

export function multiply(factor: number): Vector3 {
  return { x: this.x * factor, y: this.y * factor, z: this.z * factor }
}
