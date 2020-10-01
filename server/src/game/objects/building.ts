import GameObject, { Spotter, Drawable } from "./gameobject";
import Hex from "../../../../shared/hex";
import * as Rules from "../../../../shared/rules.json";

export default class Building extends GameObject implements Spotter, Drawable {
  
  public getSpottingRange(): number {
    return this.spottingDistance;
  }

  public getTexture():string {
    return this.texture;
  }

  public name: string;
  private spottingDistance:number;
  public pos:Hex;
  public resourceGeneration = {};
  public capacity = 100;
  public texture:string;


  constructor(owner) {
    super(owner);
  }

  public static createBuilding(owner: string, name: string, pos: Hex): Building {
    const building: Building = new Building(owner);
    building.pos = pos;
    building.name = name;
    const template = Rules.buildings[name];
    //building.spottingDistance = template.spottingDistance;
    for(let res of Object.keys(template.resource_generation)) {
      building.resourceGeneration[res] = template.resource_generation[res];
    }
    building.capacity = template.capacity;
    building.texture = template.texture;
    return building;
  }
}