import Vector2 from "../../shared/vector2";
import * as Handlebars from "handlebars";
import ClientWorld from "./clientworld";
import Selection from "./selection";
import Hex from "../../shared/hex";

export interface HudListener {
  onDisbandRequested(id: number): void;
  onResourceTransfer(id: number, resource: string, amount: number): void;
  onUnitAdd(groupId:number, unitId:number);
  onUnitRemove(groupId:number, unitId:number);
}

export default class Hud {

  private readonly listeners: HudListener[] = [];

  private divHud = document.getElementById("hud") as HTMLElement;

  private posBefore: Vector2;
  private posFinal: Vector2;
  public world: ClientWorld;
  public selection: Selection;

  private draggables: HTMLElement[] = [];

  private templateGroup = Handlebars.compile(this.divHud.querySelector("#template-group").innerHTML);

  constructor() {
    this.divHud.querySelectorAll("#hud > aside").forEach(el => {
      let element = el as HTMLElement;
      this.draggables.push(element);
      let header = el.querySelector("header") as HTMLElement;
      (el.querySelector("header > button") as HTMLElement).onclick = () => { element.style.display = "none" };
      header.onmousedown = (event) => this.onDragMouseDown(event, element);
    });
  }

  update() {
    if (this.selection.isGroup()) {
      let div = this.divHud.querySelector("#hud-selection-group") as HTMLElement;
      (div.querySelector("header > button") as HTMLElement).onclick = () => { div.style.display = "none"; this.selection.clearSelection() };
      //Resources
      let group = this.world.getGroup(this.selection.selectedGroup);
      let tile = this.world.getTile(group.pos);
      let allKeys = Object.keys(tile.resources).concat(Object.keys(group.resources));
      allKeys = allKeys.filter((item, pos) => allKeys.indexOf(item) === pos);
      let resources = [];
      for (let key of allKeys) {
        let resObj = {
          name: key,
          tile: tile.resources[key],
          group: group.resources[key]
        }
        if (resObj.tile > 0 || resObj.group > 0) {
          resources.push(resObj);
        }
      }

      div.querySelector(".hud-content").innerHTML = this.templateGroup({ group: group, resources: resources, units_tile: tile.units});

      //Resources Listener
      for (let res of resources) {
        (div.querySelector(`#${res.name}-plus-one`) as HTMLElement).onclick = () => { this.listeners.forEach((l) => l.onResourceTransfer(group.id, res.name, 1)) }
        (div.querySelector(`#${res.name}-minus-one`) as HTMLElement).onclick = () => { this.listeners.forEach((l) => l.onResourceTransfer(group.id, res.name, -1)) }
        (div.querySelector(`#${res.name}-plus-ten`) as HTMLElement).onclick = () => { this.listeners.forEach((l) => l.onResourceTransfer(group.id, res.name, 10)) }
        (div.querySelector(`#${res.name}-minus-ten`) as HTMLElement).onclick = () => { this.listeners.forEach((l) => l.onResourceTransfer(group.id, res.name, -10)) }
        (div.querySelector(`#${res.name}-plus-hundred`) as HTMLElement).onclick = () => { this.listeners.forEach((l) => l.onResourceTransfer(group.id, res.name, 100)) }
        (div.querySelector(`#${res.name}-minus-hundred`) as HTMLElement).onclick = () => { this.listeners.forEach((l) => l.onResourceTransfer(group.id, res.name, -100)) }
      }

      //Units Listener
      for(let unit of group.units) {
        (div.querySelector(`#unit-${unit.id}-remove`) as HTMLElement).onclick = () => { this.listeners.forEach((l) => l.onUnitRemove(group.id, unit.id)) }
      }
      for(let unit of tile.units) {
        (div.querySelector(`#unit-${unit.id}-add`) as HTMLElement).onclick = () => { this.listeners.forEach((l) => l.onUnitAdd(group.id, unit.id)) }
      }

      //Disband Listener
      (div.querySelector("#disband") as HTMLElement).onclick = () => {
        this.listeners.forEach((l) => l.onDisbandRequested(group.id))
        div.style.display = "none";
      };
    } else if (this.selection.isBuilding()) {
      //TODO:Fill out
    }
  }

  showGroupSelection() {
    this.draggables.forEach(el => { el.style.display = "none" });
    let div = this.divHud.querySelector("#hud-selection-group") as HTMLElement;
    div.style.display = "block";
    // div.querySelector("header > h3").innerHTML = group.id;

    // setInterval(() => {
    //   console.log(this.world.getGroup(group.id).resources["wood"]);
    // },1000);
  }

  //Draggables
  onDragMouseDown(event, element: HTMLElement) {
    let e = event || window.event;
    e.preventDefault();
    this.posBefore = new Vector2(e.clientX, e.clientY);

    this.draggables.forEach(el => {
      el.style.zIndex = "1";
    });
    element.style.zIndex = "2";

    document.onmouseup = () => this.onDragMouseUp();
    document.onmousemove = (event) => this.onDragMoved(event, element);
  }

  onDragMouseUp() {
    document.onmouseup = null;
    document.onmousemove = null;
  }

  onDragMoved(event, element) {
    let e = event || window.event;
    e.preventDefault();

    this.posFinal = new Vector2(this.posBefore.x - e.clientX, this.posBefore.y - e.clientY);
    this.posBefore = new Vector2(e.clientX, e.clientY);

    element.style.top = Math.max(0, element.offsetTop - this.posFinal.y) + "px";
    element.style.left = Math.max(0, element.offsetLeft - this.posFinal.x) + "px";
  }

  addListener(listener: HudListener) {
    this.listeners.push(listener);
  }

  removeListener(listener: HudListener) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
}


// generateUnitInfoString(units) {
//   let result = "";
//   for(let unit of units) {
//       result += "<b>Army Info</b></br>";
//       result += "Id: " + unit.id + "</br>";
//       result += "Speed: " + unit.speed.toFixed(2) + "</br>";
//       result += "Attack: " + unit.attack.toFixed(2) + "</br>";
//       result += "Health: " + unit.hp.toFixed(2) + "</br>";
//       result += "Spotting Distance: " + unit.spottingDistance.toFixed(2) + "</br>";
//       result += "Target: " + unit.targetHexes.slice(-1).pop(); +"</br>";
//       result += "</br>";
//       result += "<b>Carrying</b></br>";
//       result += "Food: " + unit.food + "</br>";
//       result += "Wood: " + unit.wood + "</br>";
//       result += "Stone: " + unit.stone + "</br>";
//       result += "Iron: " + unit.iron + "</br>";
//       result += "Gold: " + unit.gold + "</br>";
//       result += "</br>";
//       result += "</br>";
//   }        
//   return result;
// }

// generateBuildingInfoString(building) {
//   let result = "";
// result += "<b>Building Info</b></br>";
// result += "Id: " + building.id + "</br>";
// if (building.foodHarvest) {
// result += "Food Generation: " + building.foodHarvest + "</br>";
// }
// if (building.woodHarvest) {
// result += "Wood Generation: " + building.woodHarvest + "</br>";
// }
// if (building.stoneHarvest) {
// result += "Stone Generation: " + building.stoneHarvest + "</br>";
// }
// if (building.ironHarvest) {
// result += "Iron Generation: " + building.ironHarvest + "</br>";
// }
// if (building.goldHarvest) {
// result += "Iron Generation: " + building.goldHarvest + "</br>";
// }
// return result;
// }

// generateHexInfoString(tile) {
//   let result = "";
//   result += "Position: " + Hex.hash(tile.hex) + "</br>";
//   result += "</br>";
//   result += "<b>Resources</b></br>";
//   for(let res of Object.keys(tile.resources)) {
//     result += `${res}: ${tile.resources[res]}</br>`;
//   }
//   result += "</br>";
//   result += "<b>Tile Info</b></br>";
//   result += "Forestation: " + tile.forestation.toFixed(2) + "</br>";
//   result += "Iron Ore: " + tile.ironOre.toFixed(2) + "</br>";
//   result += "Gold Ore: " + tile.goldOre.toFixed(2) + "</br>";
//   result += "Height: " + tile.height.toFixed(2) + "</br>";
//   result += "Rockyness: " + tile.rockyness.toFixed(2) + "</br>";
//   result += "Movementfactor: " + tile.movementFactor.toFixed(2) + "</br>";
//   return result;
// }