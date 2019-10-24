import Hex from "../../../shared/hex";
import { Sprite } from "../../../shared/gamedata";
import Vector2 from "../../../shared/vector2";
import Mapgen from "./mapgen";
import * as GameData from "../../../shared/gamedata";

/**
 * Tile-Class representing one hex with all its relevant fields
 * Don't put too much functionality in here. The instances of this object will get sent to the clients
 */
export default class Tile {
  private hex:Hex;
  public height:number;
  public forestation:number;
  public rockyness:number;
  public movementFactor:number = 1;

  public environmentSpots:Spot[] = [];

  constructor(q:number, r:number) {
    this.hex = new Hex(q, r, -q-r);
  }

  /**
   * Fügt einen neuen Environmentspot zum Tile hinzu
   * @param sprite Sprite
   * @param id Id des Entities
   */
  public addSpot(sprite:Sprite, id:number) {
    this.environmentSpots.push(new Spot(Mapgen.generatePos(), sprite, id));
    this.refreshSpots();
  }

  /**
   * Entfernt einen Environmentspot anhand der Entity-ID
   * @param id Entity-ID
   */
  public removeSpot(id:number) {
    for(let i = 0; i < this.environmentSpots.length; i++) {
      if(this.environmentSpots[i].id === id) {
        this.environmentSpots.splice(i,1);
        return;
      }
    }
  }

  public updateMovementFactor() { //TODO calculate correct movementcost
    let movementFactor = 1;
    if(this.height < GameData.level_water_deep) {
      movementFactor = 0.01;
    } else if (this.height < GameData.level_water_shallow) {
      movementFactor = 0.1;
    }

    movementFactor -= this.environmentSpots.length*0.1;

    this.movementFactor = Math.min(1, Math.max(0.01, movementFactor));
  }

  /**
   * Setzt die Environmentspots in die richtige Reihenfolge zum zeichnen (TODO: Sollte das eher der client regeln?)
   */
  private refreshSpots() {
    this.environmentSpots.sort(function(a, b) {
      return a.pos.y - b.pos.y;
    });
  }
}

export class Spot {
  pos:Vector2;
  type:Sprite;
  id:number; //Entity id um den spot wieder zu entfernen

  constructor(pos:Vector2, type: Sprite, id) {
    this.pos = pos;
    this.type = type;
    this.id = id;
  }
}