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


export enum EnumBuilding {
  TOWN_CENTER = 0,
  FORESTER_HUT,
  QUARRY_HUT,
  IRON_HUT,
  GOLD_MINE
}

export enum EnumUnit {
  SCOUT = 0,
  SWORDSMAN,
}

class BuildingTemplate {
  id:EnumBuilding;
  name:string;
  cost:CostTemplate;
  constructor(id, name, cost) {
    this.id = id;
    this.name = name;
    this.cost = cost;
  }
}

class CostTemplate {
  wood:number;
  stone:number;
  iron:number;
  gold:number;
  constructor(wood, stone, iron, gold) {
    this.wood = wood;
    this.stone = stone;
    this.iron = iron;
    this.gold = gold;
  }
}

export const 
  building_town_center = new BuildingTemplate(EnumBuilding.TOWN_CENTER, "Town Center", new CostTemplate(100, 0, 0, 0)),
  building_forester_hut = new BuildingTemplate(EnumBuilding.FORESTER_HUT, "Forester Hut", new CostTemplate(100, 0, 0, 0)),
  building_quarry_hut = new BuildingTemplate(EnumBuilding.QUARRY_HUT, "Quarry Hut", new CostTemplate(100, 0, 0, 0)),
  building_iron_hut = new BuildingTemplate(EnumBuilding.IRON_HUT, "Iron Hut", new CostTemplate(140, 50, 0, 0)),
  building_gold_mine = new BuildingTemplate(EnumBuilding.GOLD_MINE, "Gold Mine", new CostTemplate(140, 80, 0, 0));

export const 
  buildings = [
    building_town_center,
    building_forester_hut,
    building_quarry_hut,
    building_iron_hut,
    building_gold_mine
  ];

/**
 * Represents the relation of one pair of players
 */
export class PlayerRelation {
  public id1:number;
  public id2:number;
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
  public static getHash(id1:number, id2:number):string {
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