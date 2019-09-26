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

  private static initialized:boolean = false;

  private static readonly level_water_deep:number = 0.05;
  private static readonly level_water_shallow:number = 0.1;
  private static readonly level_sand:number = 0.15;
  private static readonly level_sand_grassy:number = 0.2;
  private static readonly level_grass_sandy:number = 0.25;
  private static readonly level_grass:number = 0.6;
  private static readonly level_grass_dirty:number = 0.65;
  private static readonly level_dirt_grassy:number = 0.7;
  private static readonly level_dirt:number = 0.7;
  private static readonly level_dirt_stony:number = 0.75;
  private static readonly level_stone_dirty:number = 0.8;
  private static readonly level_stone:number = 0.9;
  private static readonly level_ice:number = 1;

  public static getTerrainImage(height) {
    if(!this.initialized) {
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
      this.initialized = true;
    }

    if(height < this.level_water_deep) {
      return this.img_terrain_water_deep;
    } else if(height < this.level_water_shallow) {
      return this.img_terrain_water_shallow;
    } else if(height < this.level_sand) {
      return this.img_terrain_sand;
    } else if(height < this.level_sand_grassy) {
      return this.img_terrain_sand_grassy;
    } else if(height < this.level_grass_sandy) {
      return this.img_terrain_grass_sandy;
    } else if(height < this.level_grass) {
      return this.img_terrain_grass;
    } else if(height < this.level_grass_dirty) {
      return this.img_terrain_grass_dirty;
    } else if(height < this.level_dirt_grassy) {
      return this.img_terrain_dirt_grassy;
    } else if(height < this.level_dirt) {
      return this.img_terrain_dirt;
    } else if(height < this.level_dirt_stony) {
      return this.img_terrain_dirt_stony;
    } else if(height < this.level_stone_dirty) {
      return this.img_terrain_stone_dirty;
    } else if(height < this.level_stone) {
      return this.img_terrain_stone;
    } else if(height <= this.level_ice) {
      return this.img_terrain_ice;
    } else return this.img_terrain_stone;
  }
  
  
}