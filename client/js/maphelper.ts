import * as Gamedata from "../../shared/gamedata";


export interface MaphelperListener {
  onImagesLoaded();

}

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

  static readonly img_tree_small = new Image();
  static readonly img_tree_big = new Image();
  static readonly img_cactus1 = new Image();
  static readonly img_cactus2 = new Image();
  static readonly img_tree_fir_small = new Image();
  static readonly img_tree_fir_big = new Image();
  static readonly img_tree_fullfir_small = new Image();
  static readonly img_tree_fullfir_big = new Image();
  static readonly img_tree_fir_snow = new Image();
  static readonly img_rock_01 = new Image();
  static readonly img_rock_02 = new Image();
  static readonly img_rock_04 = new Image();
  static readonly img_rock_05 = new Image();
  static readonly img_iron = new Image();
  static readonly img_gold = new Image();
  static readonly img_town_center = new Image();
  static readonly img_forester_hut = new Image();
  static readonly img_quarry_hut = new Image();
  static readonly img_iron_hut = new Image();
  static readonly img_gold_mine = new Image();
  static readonly img_unit_scout_own = new Image();


  public static getTerrainImage(height) {
    if (height < Gamedata.level_water_deep) {
      return this.img_terrain_water_deep;
    } else if (height < Gamedata.level_water_shallow) {
      return this.img_terrain_water_shallow;
    } else if (height < Gamedata.level_sand) {
      return this.img_terrain_sand;
    } else if (height < Gamedata.level_sand_grassy) {
      return this.img_terrain_sand_grassy;
    } else if (height < Gamedata.level_grass_sandy) {
      return this.img_terrain_grass_sandy;
    } else if (height < Gamedata.level_grass) {
      return this.img_terrain_grass;
    } else if (height < Gamedata.level_grass_dirty) {
      return this.img_terrain_grass_dirty;
    } else if (height < Gamedata.level_dirt_grassy) {
      return this.img_terrain_dirt_grassy;
    } else if (height < Gamedata.level_dirt) {
      return this.img_terrain_dirt;
    } else if (height < Gamedata.level_dirt_stony) {
      return this.img_terrain_dirt_stony;
    } else if (height < Gamedata.level_stone_dirty) {
      return this.img_terrain_stone_dirty;
    } else if (height < Gamedata.level_stone) {
      return this.img_terrain_stone;
    } else if (height <= Gamedata.level_ice) {
      return this.img_terrain_ice;
    } else return this.img_terrain_stone;
  }

  public static getSprite(env: Gamedata.Sprite) {
    switch (env) {
      case Gamedata.Sprite.envTreeSmall: return this.img_tree_small;
      case Gamedata.Sprite.envTreeBig: return this.img_tree_big;
      case Gamedata.Sprite.envCactus1: return this.img_cactus1;
      case Gamedata.Sprite.envCactus2: return this.img_cactus2;
      case Gamedata.Sprite.envTreeFirSmall: return this.img_tree_fir_small;
      case Gamedata.Sprite.envTreeFirBig: return this.img_tree_fir_big;
      case Gamedata.Sprite.envTreeFullFirSmall: return this.img_tree_fullfir_small;
      case Gamedata.Sprite.envTreeFullFirBig: return this.img_tree_fullfir_big;
      case Gamedata.Sprite.envTreeFirSnow: return this.img_tree_fir_snow;
      case Gamedata.Sprite.envRock01: return this.img_rock_01;
      case Gamedata.Sprite.envRock02: return this.img_rock_02;
      case Gamedata.Sprite.envRock04: return this.img_rock_04;
      case Gamedata.Sprite.envRock05: return this.img_rock_05;
      case Gamedata.Sprite.envIron: return this.img_iron;
      case Gamedata.Sprite.envGold: return this.img_gold;
      case Gamedata.Sprite.bldTownCenter: return this.img_town_center;
      case Gamedata.Sprite.bldForesterHut: return this.img_forester_hut;
      case Gamedata.Sprite.bldQuarryHut: return this.img_quarry_hut;
      case Gamedata.Sprite.bldIronHut: return this.img_iron_hut;
      case Gamedata.Sprite.bldGoldMine: return this.img_gold_mine;
      case Gamedata.Sprite.unitScout: return this.img_unit_scout_own;
      default: return null;
    }
  }

  static loadImages(listener: MaphelperListener) {
    let images = [
      this.img_terrain_water_deep,
      this.img_terrain_water_shallow,
      this.img_terrain_sand,
      this.img_terrain_sand_grassy,
      this.img_terrain_grass_sandy,
      this.img_terrain_grass,
      this.img_terrain_grass_dirty,
      this.img_terrain_dirt_grassy,
      this.img_terrain_dirt,
      this.img_terrain_dirt_stony,
      this.img_terrain_stone_dirty,
      this.img_terrain_stone,
      this.img_terrain_ice,
      this.img_tree_small,
      this.img_tree_big,
      this.img_cactus1,
      this.img_cactus2,
      this.img_tree_fir_small,
      this.img_tree_fir_big,
      this.img_tree_fullfir_small,
      this.img_tree_fullfir_big,
      this.img_tree_fir_snow,
      this.img_rock_01,
      this.img_rock_02,
      this.img_rock_04,
      this.img_rock_05,
      this.img_iron,
      this.img_gold,
      this.img_town_center,
      this.img_forester_hut,
      this.img_quarry_hut,
      this.img_iron_hut,
      this.img_gold_mine,
      this.img_unit_scout_own
  ];

    let imageCount: number = images.length;
    let loadedCount: number = 0;

    let checkAllLoaded = function () {
      if (loadedCount == imageCount) {
        listener.onImagesLoaded();
      }
    }

    let onImageLoaded = function () {
      loadedCount++;
      checkAllLoaded();
    }

    for(let img of images) {
      img.onload = onImageLoaded;
    }

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
    this.img_tree_small.src = "../img/tree_small.png";
    this.img_tree_big.src = "../img/tree_big.png";
    this.img_cactus1.src = "../img/cactus_01.png";
    this.img_cactus2.src = "../img/cactus_02.png";
    this.img_tree_fir_small.src = "../img/fir_small.png";
    this.img_tree_fir_big.src = "../img/fir_big.png";
    this.img_tree_fullfir_small.src = "../img/fullfir_small.png";
    this.img_tree_fullfir_big.src = "../img/fullfir_big.png";
    this.img_tree_fir_snow.src = "../img/fir_snow.png";
    this.img_rock_01.src = "../img/rock_01.png";
    this.img_rock_02.src = "../img/rock_02.png";
    this.img_rock_04.src = "../img/rock_04.png";
    this.img_rock_05.src = "../img/rock_05.png";
    this.img_iron.src = "../img/iron.png";
    this.img_gold.src = "../img/gold.png";
    this.img_town_center.src = "../img/town_center.png";
    this.img_forester_hut.src = "../img/forester_hut.png";
    this.img_quarry_hut.src = "../img/mine.png";
    this.img_iron_hut.src = "../img/mine.png";
    this.img_gold_mine.src = "../img/mine.png";
    this.img_unit_scout_own.src = "../img/unit_scout_own.png";
  }
}