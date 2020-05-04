export enum Sprite {
  envTreeSmall= 0,
  envTreeBig,
  envTreeFirSmall,
  envTreeFirBig,
  envTreeFullFirSmall,
  envTreeFullFirBig,
  envTreeFirSnow,
  envCactus1,
  envCactus2,
  envRock01,
  envRock02,
  envRock04,
  envRock05,
  envIron,
  envGold,
  bldTownCenter,
  bldForesterHut,
  bldQuarryHut,
  bldIronHut,
  bldGoldMine,
  unitScout,
}

export const 
  level_water_deep:number = 0.05,
  level_water_shallow:number = 0.1,
  level_sand:number = 0.15,
  level_sand_grassy:number = 0.2,
  level_grass_sandy:number = 0.25,
  level_grass:number = 0.6,
  level_grass_dirty:number = 0.65,
  level_dirt_grassy:number = 0.7,
  level_dirt:number = 0.7,
  level_dirt_stony:number = 0.75,
  level_stone_dirty:number = 0.8,
  level_stone:number = 0.9,
  level_ice:number = 1;

/**
 * Represents the relation of one pair of players
 */
export class PlayerRelation {
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