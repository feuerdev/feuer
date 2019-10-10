export default abstract class GameObject {
  public owner:string;
  protected id:number;
  private static idcount:number = 0;

  constructor(owner) {
    this.owner = owner;
    this.id = GameObject.idcount++;
  }
}