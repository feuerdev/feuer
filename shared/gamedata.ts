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

class Building {
  id:number;
  name:string;
  cost:Cost;
  constructor(id, name, cost) {
    this.id = id;
    this.name = name;
    this.cost = cost;
  }
}

class Cost {
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
  building_town_center = new Building(0, "Town Center", new Cost(100, 0, 0, 0)),
  building_forester_hut = new Building(0, "Forester Hut", new Cost(100, 0, 0, 0)),
  building_quarry_hut = new Building(0, "Quarry Hut", new Cost(100, 0, 0, 0)),
  building_iron_hut = new Building(0, "Iron Hut", new Cost(140, 50, 0, 0)),
  building_gold_mine = new Building(0, "Gold Mine", new Cost(140, 80, 0, 0));

export const 
  buildings = [
    building_town_center,
    building_forester_hut,
    building_quarry_hut,
    building_iron_hut,
    building_gold_mine
  ];