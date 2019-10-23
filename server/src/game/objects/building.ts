import GameObject, { Spotter } from "./gameobject";
import Hex from "../../../../shared/hex";
import { EnumBuilding, Sprite } from "../../../../shared/gamedata";



export default class Building extends GameObject implements Spotter {
  
  public getSpottingRange(): number {
    return this.spottingDistance;
  }

  private spottingDistance:number;
  public pos:Hex;
  public woodHarvest:number;
  public stoneHarvest:number;
  public ironHarvest:number;
  public goldHarvest:number;
  public sprite:Sprite;

  constructor(owner) {
    super(owner);
  }

  public static createBuilding(owner: string, type: EnumBuilding, pos: Hex): Building {
    const building: Building = new Building(owner);
    building.pos = pos;
    switch (type) {
      case EnumBuilding.TOWN_CENTER:
        building.spottingDistance = 2;
        building.woodHarvest = 1;
        building.stoneHarvest = 1;
        building.ironHarvest = 1;
        building.goldHarvest = 1;
        building.sprite = Sprite.bldTownCenter;
        break;
      case EnumBuilding.FORESTER_HUT:
        building.spottingDistance = 0;
        building.woodHarvest = 100;
        building.stoneHarvest = 0;
        building.ironHarvest = 0;
        building.goldHarvest = 0;
        building.sprite = Sprite.bldForesterHut;
        break;
      case EnumBuilding.QUARRY_HUT:
        building.spottingDistance = 0;
        building.woodHarvest = 0;
        building.stoneHarvest = 100;
        building.ironHarvest = 0;
        building.goldHarvest = 0;
        building.sprite = Sprite.bldQuarryHut;
        break;
      case EnumBuilding.IRON_HUT:
        building.spottingDistance = 0;
        building.woodHarvest = 0;
        building.stoneHarvest = 0;
        building.ironHarvest = 100;
        building.goldHarvest = 0;
        building.sprite = Sprite.bldIronHut;
        break;
      case EnumBuilding.GOLD_MINE:
        building.spottingDistance = 0;
        building.woodHarvest = 0;
        building.stoneHarvest = 0;
        building.ironHarvest = 0;
        building.goldHarvest = 100;
        building.sprite = Sprite.bldGoldMine;
        break;
      default:
        return null;
    }
    return building;
  }
}