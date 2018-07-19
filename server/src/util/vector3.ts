export default class Vector3 {

  public x:number;
  public y:number;
  public z:number;

  constructor();
  constructor(p1?:{x:number,y:number,z:number}, p2?:{x:number,y:number,z:number}) {
    if(p1 && p2) {
      this.x = p2.x - p1.x;
      this.y = p2.y - p1.y;
      this.z = p2.z - p1.z;
    }
  }

  public length():number {
    return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2) + Math.pow(this.z, 2));
  }

  public normalize(): void {
    const length = this.length();
    if(length != 0) {
        this.x /= length;
        this.y /= length;
        this.z /= length;
    }
  }
}