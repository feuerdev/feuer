import GameObject, { Spotter, Drawable } from "./gameobject";
import Hex from "../../../../shared/hex";
import * as Rules from "../../../../shared/rules.json";

export default class Building extends GameObject implements Spotter, Drawable {
  
  public getSpottingRange(): number {
    return this.spotting;
  }

  public getTexture():string {
    return this.texture;
  }

  public type:string;
  public level:number;

  public name: string;
  public spotting:number;
  public pos:Hex;
  public resourceGeneration = {};
  public hp:number;
  public texture:string;


  constructor(owner) {
    super(owner);
  }

  public static createBuilding(owner: string, name: string, pos: Hex): Building {
    const building: Building = new Building(owner);
    building.pos = pos;
    building.level = 0;
    building.type = name;
    const template = Rules.buildings[name].levels[building.level];

    
    building.name = template.name;
    building.spotting = template.spotting;
    building.resourceGeneration = this.loadResourceObject(template.resource_generation);
    building.hp = template.hp;
    building.texture = template.texture;
    return building;
  }

  public static upgradeBuilding(building:Building) {
    let template = Rules.buildings[building.type];
    if(template.levels.length >= building.level+1) {
      building.level++;
      let newTemplate = Rules.buildings[building.type].levels[building.level];
      building.resourceGeneration = this.loadResourceObject(newTemplate.resource_generation);
      building.name = newTemplate.name;
      building.texture = newTemplate.texture;
      building.hp = newTemplate.hp;      
      building.spotting = newTemplate.spotting;
    }
  }

  public static loadResourceObject(template) {
    let result = {};
    for(let res of Object.keys(template)) {
      result[res] = template[res];
    }
    return result;
  }

}