
/**
 * Represents the relation of one pair of players
 */
export default class PlayerRelation {
  public id1:string;
  public id2:string;
  public relationType: EnumRelationType;
  
  constructor(id1, id2, relationType) {
    this.id1 = id1;
    this.id2 = id2;
    this.relationType = relationType;
  }

  public hash():string {
    return PlayerRelation.getHash(this.id1, this.id2);
  }

  /**
   * Always put the lower id first
   */
  public static getHash(id1:string, id2:string):string {
    if(id1 < id2) {
      return id1 + "-" + id2;
    } else {
      return id2 + "-" + id1;
    }
  }
}

export enum EnumRelationType {
  rtNeutral = 0,
  rtFriendly = 1,
  rtHostile = 2
}