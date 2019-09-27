import * as Gamedata from "../../shared/gamedata";

export default class Maphelper {

  static readonly img_terrain_water_deep = new Image(); //Wasser-Tief
  static readonly img_terrain_water_shallow = new Image(); //Wasser-Flach
  static readonly img_terrain_sand = new Image(); //Sand
  static readonly img_terrain_sand_grassy = new Image(); //Sand-Gras
  static readonly img_terrain_grass_sandy = new Image(); //Gras-Sand
  static readonly img_terrain_grass = new Image(); //Gras
  static readonly img_terrain_grass_dirty = new Image(); //Gras-Erde
  static readonly img_terrain_dirt_grassy = new Image(); //Erde-Gras
  static readonly img_terrain_dirt = new Image(); //Erde
  static readonly img_terrain_dirt_stony = new Image(); //Erde-Stein
  static readonly img_terrain_stone_dirty = new Image(); //Stein-Erde
  static readonly img_terrain_stone = new Image(); //Stein
  static readonly img_terrain_ice = new Image(); //Eis

  static readonly img_trees_few = new Image();
  static readonly img_trees_mixed = new Image();
  static readonly img_trees_firs = new Image();
  static readonly img_trees_firs2 = new Image();
  static readonly img_stone = new Image();

  private static initialized_environment:boolean = false;
  private static initialized_terrain:boolean = false;


  public static getTerrainImage(height) {
    if(!this.initialized_terrain) {
      this.img_terrain_water_deep.src = "../img/water_02.png";
      this.img_terrain_water_shallow.src = "../img/water_01.png";
      this.img_terrain_sand.src = "../img/sand_07.png";
      this.img_terrain_sand_grassy.src = "../img/sand_09.png";
      this.img_terrain_grass_sandy.src = "../img/grass_07.png";
      this.img_terrain_grass.src = "../img/grass_05.png";
      this.img_terrain_grass_dirty.src = "../img/grass_06.png";
      this.img_terrain_dirt_grassy.src = "../img/dirt_07.png";
      this.img_terrain_dirt.src = "../img/dirt_06.png";
      this.img_terrain_dirt_stony.src = "../img/dirt_10.png";
      this.img_terrain_stone_dirty.src = "../img/stone_09.png";
      this.img_terrain_stone.src = "../img/stone_07.png";
      this.img_terrain_ice.src = "../img/ice_01.png";
      this.initialized_terrain = true;
    }

    if(height < Gamedata.level_water_deep) {
      return this.img_terrain_water_deep;
    } else if(height < Gamedata.level_water_shallow) {
      return this.img_terrain_water_shallow;
    } else if(height < Gamedata.level_sand) {
      return this.img_terrain_sand;
    } else if(height < Gamedata.level_sand_grassy) {
      return this.img_terrain_sand_grassy;
    } else if(height < Gamedata.level_grass_sandy) {
      return this.img_terrain_grass_sandy;
    } else if(height < Gamedata.level_grass) {
      return this.img_terrain_grass;
    } else if(height < Gamedata.level_grass_dirty) {
      return this.img_terrain_grass_dirty;
    } else if(height < Gamedata.level_dirt_grassy) {
      return this.img_terrain_dirt_grassy;
    } else if(height < Gamedata.level_dirt) {
      return this.img_terrain_dirt;
    } else if(height < Gamedata.level_dirt_stony) {
      return this.img_terrain_dirt_stony;
    } else if(height < Gamedata.level_stone_dirty) {
      return this.img_terrain_stone_dirty;
    } else if(height < Gamedata.level_stone) {
      return this.img_terrain_stone;
    } else if(height <= Gamedata.level_ice) {
      return this.img_terrain_ice;
    } else return this.img_terrain_stone;
  }

  public static getEnvironmentImage(env:Gamedata.Environment) {
    if(!this.initialized_environment) {
      this.img_trees_few.src = "../img/trees_few.png";
      this.img_trees_firs.src = "../img/trees_firs.png";
      this.img_trees_mixed.src = "../img/trees_mixed.png";
      this.img_trees_firs2.src = "../img/trees_firs2.png";
      this.img_stone.src = "../img/stone.png";
      this.initialized_environment = true;
    }

    switch(env) {
      case Gamedata.Environment.envTreesFew: return this.img_trees_few;
      case Gamedata.Environment.envTreesFirs: return this.img_trees_firs;
      case Gamedata.Environment.envTreesMixed: return this.img_trees_mixed;
      case Gamedata.Environment.envTreesFirs2: return this.img_trees_firs;
      case Gamedata.Environment.envStone: return this.img_stone;
      default: return null;
    }
  }
}