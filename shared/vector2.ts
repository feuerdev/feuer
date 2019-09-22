import Vector3 from "./vector3";

export default class Vector2 {
 

  public x: number = 0;
  public y: number = 0;

  constructor(); //Constructor 1
  constructor(angle: number); //Constructor 2
  constructor(p1: { x: number, y: number }, p2: { x: number, y: number }); //Constructor 3
  constructor(x: number, y: number); //Constructor 4
  constructor(arg1?: { x: number, y: number } | number, arg2?: { x: number, y: number } | number) {
    if (arg1 !== undefined && arg2 !== undefined) {
      if (typeof arg1 === "number" && typeof arg2 === "number") {
        //Constructor 4
        this.x = arg1;
        this.y = arg2;
      } else if (typeof arg1 === "object" && typeof arg2 === "object") {
        //Constructor 3
        this.x = arg2.x - arg1.x;
        this.y = arg2.y - arg1.y;
      }
    } else if (arg1) {
      //Constructor 2
      if(typeof arg1 === "number") {
        this.x = Math.cos(arg1);
        this.y = Math.sin(arg1);
        this.normalize();
      }
    } else {
      //Constructor 1
    }
  }

  public length(): number {
    return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
  }

  public normalize(): void {
    const length = this.length();
    if (length != 0) {
      this.x /= length;
      this.y /= length;
    }
  }

  public add(vector:Vector2): Vector2 {
    return new Vector2(this.x + vector.x, this.y + vector.y);
  }

  public toVector3(): Vector3 {
    return new Vector3(this.x, this.y, 0);  
  }
}