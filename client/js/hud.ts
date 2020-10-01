import Vector2 from "../../shared/vector2";
import * as Handlebars from "handlebars";
import ClientWorld from "./clientworld";
import Selection from "./selection";
import { union } from "../../shared/util";

export interface HudListener {
  onDisbandRequested(id: number): void;
  onResourceTransfer(id: number, resource: string, amount: number): void;
  onUnitAdd(groupId: number, unitId: number): void;
  onUnitRemove(groupId: number, unitId: number): void;
}

Handlebars.registerHelper('twodigits', function(text) {
  return text.toFixed(2);
});

export default class Hud {

  private readonly listeners: HudListener[] = [];

  private divHud = document.getElementById("hud") as HTMLElement;

  private posBefore: Vector2;
  private posFinal: Vector2;
  public world: ClientWorld;
  public selection: Selection;

  private draggables: HTMLElement[] = [];

  private templateGroup = Handlebars.compile(this.divHud.querySelector("#template-group").innerHTML);
  private templateTile = Handlebars.compile(this.divHud.querySelector("#template-tile").innerHTML);
  // private templateBuilding = Handlebars.compile(this.divHud.querySelector("#template-building").innerHTML);


  constructor() {
    //Setup dragging and closing
    this.divHud.querySelectorAll("#hud > aside").forEach(el => {
      this.draggables.push(el as HTMLElement);
      el.querySelectorAll("header > button").forEach(btn => {
        (btn as HTMLElement).onclick = () => {
          (el as HTMLElement).style.display = "none"
        }
      });
      el.querySelector("header").onmousedown = (event) => this.onDragMouseDown(event, el as HTMLElement);
    });
  }

  setupGroupSelection() {
    let div = this.divHud.querySelector("#hud-selection-group") as HTMLElement;
    //Setup closing
    (div.querySelector("header > button") as HTMLElement).onclick = () => { div.style.display = "none"; this.selection.clearSelection() };

    //Setup data objects
    let group = this.world.getGroup(this.selection.selectedGroup);
    let tile = this.world.getTile(group.pos);
    let resources = [];
    union(Object.keys(tile.resources), Object.keys(group.resources)).forEach(key => {
      let valueTile = tile.resources[key];
      let valueGroup = group.resources[key];
      if (valueTile > 0 || valueGroup > 0) {
        resources.push({ name: key, tile: valueTile, group: valueGroup });
      }
    });

    //Populate template
    div.querySelector(".hud-content").innerHTML = this.templateGroup({ group: group, resources: resources, units_tile: tile.units });

    //Setup listeners
    for (let res of resources) {
      (div.querySelector(`#${res.name}-plus-one`) as HTMLElement).onclick = () => { this.listeners.forEach((l) => l.onResourceTransfer(group.id, res.name, 1)) }
      (div.querySelector(`#${res.name}-minus-one`) as HTMLElement).onclick = () => { this.listeners.forEach((l) => l.onResourceTransfer(group.id, res.name, -1)) }
      (div.querySelector(`#${res.name}-plus-ten`) as HTMLElement).onclick = () => { this.listeners.forEach((l) => l.onResourceTransfer(group.id, res.name, 10)) }
      (div.querySelector(`#${res.name}-minus-ten`) as HTMLElement).onclick = () => { this.listeners.forEach((l) => l.onResourceTransfer(group.id, res.name, -10)) }
      (div.querySelector(`#${res.name}-plus-hundred`) as HTMLElement).onclick = () => { this.listeners.forEach((l) => l.onResourceTransfer(group.id, res.name, 100)) }
      (div.querySelector(`#${res.name}-minus-hundred`) as HTMLElement).onclick = () => { this.listeners.forEach((l) => l.onResourceTransfer(group.id, res.name, -100)) }
    }

    for (let unit of group.units) {
      (div.querySelector(`#unit-${unit.id}-remove`) as HTMLElement).onclick = () => { this.listeners.forEach((l) => l.onUnitRemove(group.id, unit.id)) }
    }
    for (let unit of tile.units) {
      (div.querySelector(`#unit-${unit.id}-add`) as HTMLElement).onclick = () => { this.listeners.forEach((l) => l.onUnitAdd(group.id, unit.id)) }
    }

    //Disband Listener
    (div.querySelector("#disband") as HTMLElement).onclick = () => {
      this.listeners.forEach((l) => l.onDisbandRequested(group.id))
      div.style.display = "none";
    };
  }

  setupTileSelection() {
    let div = this.divHud.querySelector("#hud-selection-tile") as HTMLElement;
    //Setup closing
    (div.querySelector("header > button") as HTMLElement).onclick = () => { div.style.display = "none"; this.selection.clearSelection() };

    //Setup data objects
    let tile = this.world.getTile(this.selection.selectedHex);
    let resources = [];
    Object.keys(tile.resources).forEach(res => {
      let value = tile.resources[res]
      if(value > 0) {
        resources.push({name: res, value:value});
      }
    });
    let buildings = this.world.getBuildings(tile.hex);
    let groups = this.world.getGroups(tile.hex);

    //Populate template
    div.querySelector(".hud-content").innerHTML = this.templateTile({ tile: tile, resources: resources, buildings: buildings, groups: groups });

    //Setup listeners
    for (let building of buildings) {
      (div.querySelector(`#building-${building.id}-select`) as HTMLElement).onclick = () => { 
        this.selection.selectBuilding(building.id); 
        this.showBuildingSelection();
        this.update();
      }
    }
    for (let group of groups) {
      (div.querySelector(`#group-${group.id}-select`) as HTMLElement).onclick = () => { 
        this.selection.selectGroup(group.id); 
        this.showGroupSelection();
        this.update();
       }
    }
  }

  setupBuildingSelection() {
    let div = this.divHud.querySelector("#hud-selection-building") as HTMLElement;
    //Setup closing
    (div.querySelector("header > button") as HTMLElement).onclick = () => { div.style.display = "none"; this.selection.clearSelection() };
    
    //Setup data objects
    // let tile = ;
    // let resources = ;
    // let buildings = ;

    //Populate template
    // div.querySelector(".hud-content").innerHTML = this.templateGroup({ tile: tile, resources: resources, buildings: buildings });

    //Setup listeners
  }

  update() {
    if (this.selection.isGroup()) {
      this.setupGroupSelection();
    } else if (this.selection.isHex()) {
      this.setupTileSelection();
    } else if(this.selection.isBuilding()) {
      this.setupBuildingSelection();
    }
  }

  showGroupSelection() {
    this.draggables.forEach(el => { el.style.display = "none" });
    let div = this.divHud.querySelector("#hud-selection-group") as HTMLElement;
    div.style.display = "block";
  }

  showTileSelection() {
    this.draggables.forEach(el => { el.style.display = "none" });
    let div = this.divHud.querySelector("#hud-selection-tile") as HTMLElement;
    div.style.display = "block";
  }

  showBuildingSelection() {
    this.draggables.forEach(el => { el.style.display = "none" });
    let div = this.divHud.querySelector("#hud-selection-building") as HTMLElement;
    div.style.display = "block";
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