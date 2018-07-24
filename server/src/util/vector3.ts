import * as Util from "./util";
export default class Vector3 {
  public x: number = 0;
  public y: number = 0;
  public z: number = 0;

  constructor(); //Constructor 1
  constructor(angleHorizontal: number, angleVertical: number); //Constructor 2
  constructor(p1: { x: number, y: number, z: number }, p2: { x: number, y: number, z: number }); //Constructor 3
  constructor(x: number, y: number, z: number);
  constructor(arg1?: { x: number, y: number, z: number } | number, arg2?: { x: number, y: number, z: number } | number, arg3?: number) {
    if (typeof arg1 !== "undefined" && typeof arg2 !== "undefined" && typeof arg3 !== "undefined") {
      if (typeof arg1 === "number" && typeof arg2 === "number" && typeof arg3 === "number") {
        this.x = arg1;
        this.y = arg2;
        this.z = arg3;
      }
    } else if (typeof arg1 !== "undefined" && typeof arg2 !== "undefined") {
      if (typeof arg1 === "number" && typeof arg2 === "number") {
        //Constructor 2
        arg1 = Util.degreeToRadians(arg1);
        arg2 = Util.degreeToRadians(arg2);
        this.x = Math.cos(arg1) * Math.cos(arg2);
        this.y = Math.sin(arg1) * Math.cos(arg2);
        this.z = Math.sin(arg2);
        this.normalize();
      } else if (typeof arg1 === "object" && typeof arg2 === "object") {
        //Constructor 3
        this.x = arg2.x - arg1.x;
        this.y = arg2.y - arg1.y;
        this.z = arg2.z - arg1.z;
      }
    } else {
      //Constructor 1
    }
  }

  public length(): number {
    return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2) + Math.pow(this.z, 2));
  }

  public normalize(): void {
    const length = this.length();
    if (length != 0) {
      this.x /= length;
      this.y /= length;
      this.z /= length;
    }
  }

  public add(vector: Vector3): Vector3 {
    return new Vector3(this.x + vector.x, this.y + vector.y, this.z + vector.z);
  }

  public multiply(factor: number): Vector3 {
    return new Vector3(this.x * factor, this.y * factor, this.z * factor);
  }
}