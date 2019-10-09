export default abstract class GameObject {
  protected owner:string; 

  constructor(owner) {
    this.owner = owner;
  }
}