import Vector2 from "./vector2";

export default class Hex {

  constructor(public q: number, public r: number, public s: number) {
    if (Math.round(q + r + s) !== 0) throw "q+r+s must be 0";
  }

  public add(hex: Hex) {
    return new Hex(this.q + hex.q, this.r + hex.r, this.s + hex.s);
  }

  public subtract(hex: Hex) {
    return new Hex(this.q - hex.q, this.r - hex.r, this.s - hex.s);
  }

  public scale(value: number) {
    return new Hex(this.q * value, this.r * value, this.s * value);
  }

  public rotateLeft() {
    return new Hex(-this.s, -this.q, -this.r);
  }

  public rotateRight() {
    return new Hex(-this.r, -this.s, -this.q);
  }

  public static directions: Hex[] = [new Hex(1, 0, -1), new Hex(1, -1, 0), new Hex(0, -1, 1), new Hex(-1, 0, 1), new Hex(-1, 1, 0), new Hex(0, 1, -1)];

  public static direction(direction: number): Hex {
    return Hex.directions[direction];
  }

  public neighbor(direction: number): Hex {
    return this.add(Hex.direction(direction));
  }

  public static diagonals: Hex[] = [new Hex(2, -1, -1), new Hex(1, -2, 1), new Hex(-1, -1, 2), new Hex(-2, 1, 1), new Hex(-1, 2, -1), new Hex(1, 1, -2)];

  public diagonalNeighbor(direction: number): Hex {
    return this.add(Hex.diagonals[direction]);
  }

  public length(): number {
    return (Math.abs(this.q) + Math.abs(this.r) + Math.abs(this.s)) / 2;
  }

  public distance(b: Hex): number {
    return this.subtract(b).length();
  }

  public round(): Hex {
    var qi: number = Math.round(this.q);
    var ri: number = Math.round(this.r);
    var si: number = Math.round(this.s);
    var q_diff: number = Math.abs(qi - this.q);
    var r_diff: number = Math.abs(ri - this.r);
    var s_diff: number = Math.abs(si - this.s);
    if (q_diff > r_diff && q_diff > s_diff) {
      qi = -ri - si;
    } else {
      if (r_diff > s_diff) {
        ri = -qi - si;
      } else {
        si = -qi - ri;
      }
    }
    return new Hex(qi, ri, si);
  }

  public lerp(b: Hex, t: number): Hex {
    return new Hex(this.q * (1.0 - t) + b.q * t, this.r * (1.0 - t) + b.r * t, this.s * (1.0 - t) + b.s * t);
  }

  public hexesTo(b: Hex): Hex[] {
    const N: number = this.distance(b);
    const a_nudge: Hex = new Hex(this.q + 0.000001, this.r + 0.000001, this.s - 0.000002);
    const b_nudge: Hex = new Hex(b.q + 0.000001, b.r + 0.000001, b.s - 0.000002);
    const results: Hex[] = [];
    const step: number = 1.0 / Math.max(N, 1);
    for (var i = 0; i <= N; i++) {
      results.push(a_nudge.lerp(b_nudge, step * i).round());
    }
    return results;
  }

  public equals(hex:Hex) {
    return this.q === hex.q && this.r === hex.r && this.s === hex.s;
  }
}

export class OffsetCoord {
  constructor(public col: number, public row: number) { }
  public static EVEN: number = 1;
  public static ODD: number = -1;

  public static qoffsetFromCube(offset: number, h: Hex): OffsetCoord {
    var col: number = h.q;
    var row: number = h.r + (h.q + offset * (h.q & 1)) / 2;
    return new OffsetCoord(col, row);
  }

  public static qoffsetToCube(offset: number, h: OffsetCoord): Hex {
    var q: number = h.col;
    var r: number = h.row - (h.col + offset * (h.col & 1)) / 2;
    var s: number = -q - r;
    return new Hex(q, r, s);
  }

  public static roffsetFromCube(offset: number, h: Hex): OffsetCoord {
    var col: number = h.q + (h.r + offset * (h.r & 1)) / 2;
    var row: number = h.r;
    return new OffsetCoord(col, row);
  }

  public static roffsetToCube(offset: number, h: OffsetCoord): Hex {
    var q: number = h.col - (h.row + offset * (h.row & 1)) / 2;
    var r: number = h.row;
    var s: number = -q - r;
    return new Hex(q, r, s);
  }
}

export class Orientation {
  constructor(public f0: number, public f1: number, public f2: number, public f3: number, public b0: number, public b1: number, public b2: number, public b3: number, public start_angle: number) { }
}

export class Layout {
  constructor(public orientation: Orientation, public size: Vector2, public origin: Vector2) { }
  public static pointy: Orientation = new Orientation(Math.sqrt(3.0), Math.sqrt(3.0) / 2.0, 0.0, 3.0 / 2.0, Math.sqrt(3.0) / 3.0, -1.0 / 3.0, 0.0, 2.0 / 3.0, 0.5);
  public static flat: Orientation = new Orientation(3.0 / 2.0, 0.0, Math.sqrt(3.0) / 2.0, Math.sqrt(3.0), 2.0 / 3.0, 0.0, -1.0 / 3.0, Math.sqrt(3.0) / 3.0, 0.0);

  public hexToPixel(h: Hex): Vector2 {
    var M: Orientation = this.orientation;
    var size: Vector2 = this.size;
    var origin: Vector2 = this.origin;
    var x: number = (M.f0 * h.q + M.f1 * h.r) * size.x;
    var y: number = (M.f2 * h.q + M.f3 * h.r) * size.y;
    return new Vector2(x + origin.x, y + origin.y);
  }

  public pixelToHex(p: Vector2): Hex {
    var M: Orientation = this.orientation;
    var size: Vector2 = this.size;
    var origin: Vector2 = this.origin;
    var pt: Vector2 = new Vector2((p.x - origin.x) / size.x, (p.y - origin.y) / size.y);
    var q: number = M.b0 * pt.x + M.b1 * pt.y;
    var r: number = M.b2 * pt.x + M.b3 * pt.y;
    return new Hex(q, r, -q - r);
  }

  public hexCornerOffset(corner: number): Vector2 {
    var M: Orientation = this.orientation;
    var size: Vector2 = this.size;
    var angle: number = 2.0 * Math.PI * (M.start_angle - corner) / 6.0;
    return new Vector2((size.x * Math.cos(angle))*0.99, (size.y * Math.sin(angle))*0.99); //*0.99 um lücken zwischen den hexes zu haben
  }

  public polygonCorners(h: Hex): Vector2[] {
    var corners: Vector2[] = [];
    var center: Vector2 = this.hexToPixel(h);
    for (var i = 0; i < 6; i++) {
      var offset: Vector2 = this.hexCornerOffset(i);
      corners.push(new Vector2(center.x + offset.x, center.y + offset.y));
    }
    return corners;
  }

}