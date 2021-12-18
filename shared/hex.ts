import Vector2 from "./vector2"

export default interface Hex {
  q: number
  r: number
  s: number
}
export function create(q: number, r: number, s: number = -q - r): Hex {
  return { q: q, r: r, s: s }
}

export function add(a: Hex, b: Hex): Hex {
  return { q: a.q + b.q, r: a.r + b.r, s: a.s + b.s }
}

export function subtract(a: Hex, b: Hex) {
  return { q: a.q - b.q, r: a.r - b.r, s: a.s - b.s }
}

export function scale(hex: Hex, value: number) {
  return { q: hex.q * value, r: hex.r * value, s: hex.s * value }
}

export function rotateLeft(hex: Hex) {
  return { q: -hex.s, r: -hex.q, s: -hex.r }
}

export function rotateRight(hex: Hex) {
  return { q: -hex.r, r: -hex.s, s: -hex.q }
}

export const directions: Hex[] = [
  { q: 1, r: 0, s: -1 },
  { q: 1, r: -1, s: 0 },
  { q: 0, r: -1, s: 1 },
  { q: -1, r: 0, s: 1 },
  { q: -1, r: 1, s: 0 },
  { q: 0, r: 1, s: -1 },
]

export function direction(direction: number): Hex {
  return directions[direction]
}

export function neighbor(hex: Hex, dir: number): Hex {
  return add(hex, direction(dir))
}

export function neighbors(hex: Hex): Hex[] {
  let result: Hex[] = []
  for (let direction of directions) {
    result.push(add(hex, direction))
  }
  return result
}

export function neighborsRange(hex: Hex, radius: number): Hex[] {
  let result: Hex[] = [hex]
  for (let i = 1; i <= radius; i++) {
    result.push(...ring(hex, i))
  }
  return result
}

export function ring(hex: Hex, radius: number) {
  let results = []
  let pointer = add(hex, scale(subtract(neighbor(hex, 4), hex), radius)) //TODO: Check this

  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < radius; j++) {
      results.push(pointer)
      pointer = neighbor(pointer, i)
    }
  }
  return results
}

export const diagonals: Hex[] = [
  { q: 2, r: -1, s: -1 },
  { q: 1, r: -2, s: 1 },
  { q: -1, r: -1, s: 2 },
  { q: -2, r: 1, s: 1 },
  { q: -1, r: 2, s: -1 },
  { q: 1, r: 1, s: -2 },
]

export function diagonalNeighbor(hex: Hex, direction: number): Hex {
  return add(hex, diagonals[direction])
}

export function length(hex: Hex): number {
  return (Math.abs(hex.q) + Math.abs(hex.r) + Math.abs(hex.s)) / 2
}

export function distance(a: Hex, b: Hex): number {
  return length(subtract(a, b))
}

export function round(hex: Hex): Hex {
  var qi: number = Math.round(hex.q)
  var ri: number = Math.round(hex.r)
  var si: number = Math.round(hex.s)
  var q_diff: number = Math.abs(qi - hex.q)
  var r_diff: number = Math.abs(ri - hex.r)
  var s_diff: number = Math.abs(si - hex.s)
  if (q_diff > r_diff && q_diff > s_diff) {
    qi = -ri - si
  } else {
    if (r_diff > s_diff) {
      ri = -qi - si
    } else {
      si = -qi - ri
    }
  }
  return { q: qi, r: ri, s: si }
}

export function lerp(a: Hex, b: Hex, t: number): Hex {
  return {
    q: a.q * (1.0 - t) + b.q * t,
    r: a.r * (1.0 - t) + b.r * t,
    s: a.s * (1.0 - t) + b.s * t,
  }
}

export function hexesTo(a: Hex, b: Hex): Hex[] {
  const N: number = distance(a, b)
  const a_nudge: Hex = {
    q: a.q + 0.000001,
    r: a.r + 0.000001,
    s: a.s - 0.000002,
  }
  const b_nudge: Hex = {
    q: b.q + 0.000001,
    r: b.r + 0.000001,
    s: b.s - 0.000002,
  }
  const results: Hex[] = []
  const step: number = 1.0 / Math.max(N, 1)
  for (var i = 0; i <= N; i++) {
    results.push(round(lerp(a_nudge, b_nudge, step * i)))
  }
  return results
}

export function hash(hex: Hex): string {
  return hex.q + "-" + hex.r
}

export function equals(a: Hex, b: Hex): boolean {
  return a.q === b.q && a.r === b.r && a.s === b.s
}

export class OffsetCoord {
  constructor(public col: number, public row: number) {}
  public static EVEN: number = 1
  public static ODD: number = -1

  public static qoffsetFromCube(offset: number, h: Hex): OffsetCoord {
    var col: number = h.q
    var row: number = h.r + (h.q + offset * (h.q & 1)) / 2
    return new OffsetCoord(col, row)
  }

  public static qoffsetToCube(offset: number, h: OffsetCoord): Hex {
    var q: number = h.col
    var r: number = h.row - (h.col + offset * (h.col & 1)) / 2
    var s: number = -q - r
    return { q: q, r: r, s: s }
  }

  public static roffsetFromCube(offset: number, h: Hex): OffsetCoord {
    var col: number = h.q + (h.r + offset * (h.r & 1)) / 2
    var row: number = h.r
    return new OffsetCoord(col, row)
  }

  public static roffsetToCube(offset: number, h: OffsetCoord): Hex {
    var q: number = h.col - (h.row + offset * (h.row & 1)) / 2
    var r: number = h.row
    var s: number = -q - r
    return { q: q, r: r, s: s }
  }
}

export class Orientation {
  constructor(
    public f0: number,
    public f1: number,
    public f2: number,
    public f3: number,
    public b0: number,
    public b1: number,
    public b2: number,
    public b3: number,
    public start_angle: number
  ) {}
}

export class Layout {
  constructor(public orientation: Orientation, public size: Vector2, public origin: Vector2) {}
  public static pointy: Orientation = new Orientation(
    Math.sqrt(3.0),
    Math.sqrt(3.0) / 2.0,
    0.0,
    3.0 / 2.0,
    Math.sqrt(3.0) / 3.0,
    -1.0 / 3.0,
    0.0,
    2.0 / 3.0,
    0.5
  )
  public static flat: Orientation = new Orientation(
    3.0 / 2.0,
    0.0,
    Math.sqrt(3.0) / 2.0,
    Math.sqrt(3.0),
    2.0 / 3.0,
    0.0,
    -1.0 / 3.0,
    Math.sqrt(3.0) / 3.0,
    0.0
  )

  public hexToPixel(h: Hex): Vector2 {
    var M: Orientation = this.orientation
    var size: Vector2 = this.size
    var origin: Vector2 = this.origin
    var x: number = (M.f0 * h.q + M.f1 * h.r) * size.x
    var y: number = (M.f2 * h.q + M.f3 * h.r) * size.y
    return { x: x + origin.x, y: y + origin.y }
  }

  public pixelToHex(p: Vector2): Hex {
    var M: Orientation = this.orientation
    var size: Vector2 = this.size
    var origin: Vector2 = this.origin
    var pt: Vector2 = {
      x: (p.x - origin.x) / size.x,
      y: (p.y - origin.y) / size.y,
    }
    var q: number = M.b0 * pt.x + M.b1 * pt.y
    var r: number = M.b2 * pt.x + M.b3 * pt.y
    return { q: q, r: r, s: -q - r }
  }

  public hexCornerOffset(corner: number): Vector2 {
    var M: Orientation = this.orientation
    var size: Vector2 = this.size
    var angle: number = (2.0 * Math.PI * (M.start_angle - corner)) / 6.0
    return { x: size.x * Math.cos(angle), y: size.y * Math.sin(angle) }
  }

  public polygonCorners(h: Hex): Vector2[] {
    var corners: Vector2[] = []
    var center: Vector2 = this.hexToPixel(h)
    for (var i = 0; i < 6; i++) {
      var offset: Vector2 = this.hexCornerOffset(i)
      corners.push({ x: center.x + offset.x, y: center.y + offset.y })
    }
    return corners
  }
}
