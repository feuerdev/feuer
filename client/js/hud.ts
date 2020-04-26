import * as $ from "./lib/jquery-3.1.1.min";
import * as GameData from "../../shared/gamedata";
import Hex from "../../shared/hex";

export interface HudListener {
  onConstructionRequested?(typeId):void;
}

enum EnumTab {
  tabBuildings,
  tabUnits
}

export default class Hud {

  private divConstruction;
  private divSelection;
  private btnConstructionBuildings;
  private btnConstructionUnits;
  private btnSelectionBuildings;
  private btnSelectionUnits;

  private divSelectionContent;

  private readonly listeners:HudListener[] = [];

  constructor() {
    this.divConstruction = $(".hud-left");
    this.divSelection = $(".hud-right");

    this.btnConstructionBuildings = $("#button-construction-buildings");
    this.btnConstructionUnits = $("#button-construction-units");
    this.btnSelectionBuildings = $("#button-selection-buildings");
    this.btnSelectionUnits = $("#button-selection-units");
    this.divSelectionContent = $("#content-selection-buildings");

    this.btnConstructionBuildings.click(()=>this.onConstructionTabSelected(EnumTab.tabBuildings))
    this.btnConstructionUnits.click(()=>this.onConstructionTabSelected(EnumTab.tabUnits))

    this.btnSelectionBuildings.click(()=>this.onSelectionTabSelected(EnumTab.tabBuildings))
    this.btnSelectionUnits.click(()=>this.onSelectionTabSelected(EnumTab.tabUnits))

    this.onConstructionTabSelected(EnumTab.tabBuildings);
    this.onSelectionTabSelected(EnumTab.tabBuildings);

    //Populate construction using template
    let template = $(".hud-tab-content-template");
    template.hide();
    for(let i = 0; i<GameData.buildings.length; i++) {
      let clone = template.clone();
      clone.show();
      clone.children('#construction-template-label').text(GameData.buildings[i].name);
      clone.children('#construction-template-button').click(() => {
        console.log(GameData.buildings[i].name+" clicked");
        for(let listener of this.listeners) {
          if(listener.onConstructionRequested) {
            listener.onConstructionRequested(GameData.buildings[i].id);
          }          
        }
      });
      $("#content-construction-buildings").append(clone);
    }
  }

  onConstructionTabSelected(tab: EnumTab): any {
    switch(tab) {
      case EnumTab.tabBuildings:
          this.btnConstructionBuildings.addClass("active");
          this.btnConstructionUnits.removeClass("active");
          $("#content-construction-buildings").show(); 
          $("#content-construction-units").hide(); 
        break;
      case EnumTab.tabUnits:
          this.btnConstructionUnits.addClass("active");
          this.btnConstructionBuildings.removeClass("active");
          $("#content-construction-units").show(); 
          $("#content-construction-buildings").hide();
        break;
      default: break;
    }
  }

  onSelectionTabSelected(tab: EnumTab): any {
    switch(tab) {
      case EnumTab.tabBuildings:
          this.btnSelectionBuildings.addClass("active");
          this.btnSelectionUnits.removeClass("active");
          $("#content-selection-buildings").show(); 
          $("#content-selection-units").hide(); 
        break;
      case EnumTab.tabUnits:
          this.btnSelectionBuildings.removeClass("active");
          this.btnSelectionUnits.addClass("active");
          $("#content-selection-units").show(); 
          $("#content-selection-buildings").hide();
        break;
      default: break;
    }
  }

  showSelectionHud(cWorld, hex:Hex) {
    let tile = cWorld.tiles[hex.hash()];
    this.divSelection.show();
    this.divSelectionContent.text("");
    for(let army of cWorld.armies) {
      if(hex.equals(army.pos)) {
        this.divSelectionContent.append(this.generateArmyInfoString(army));
      }
    }
    this.divSelectionContent.append(this.generateTileInfoString(tile));
  }

  showConstructionHud() {
    this.divConstruction.show();
  }

  hideSelectionHud() {
    this.divSelection.hide();
  }

  hideConstructionHud() {
    this.divConstruction.hide();
  }

  hideHud() {
    this.hideSelectionHud();
    this.hideConstructionHud();
  }

  generateArmyInfoString(army):string {
    let result = "";
    result+= "<b>Carrying</b></br>";
    result+= "Food: "+army.food+"</br>";
    result+= "Wood: "+army.wood+"</br>";
    result+= "Stone: "+army.stone+"</br>";
    result+= "Iron: "+army.iron+"</br>";
    result+= "Gold: "+army.gold+"</br>";
    result+= "</br>";
    result+= "<b>Army Info</b></br>";
    result+= "Speed: "+army.speed.toFixed(2)+"</br>";
    result+= "Attack: "+army.attack.toFixed(2)+"</br>";
    result+= "Health: "+army.health.toFixed(2)+"</br>";
    result+= "Spotting Distance: "+army.spottingDistance.toFixed(2)+"</br>";
    result+= "Target: "+army.targetHexes.slice(-1).pop();+"</br>";
    return result;
  }

  generateTileInfoString(tile):string {
    let result = "";
    result+= "Position: "+Hex.hash(tile.hex)+"</br>";
    result+= "</br>";
    result+= "<b>Resources</b></br>";
    result+= "Food: "+tile.food+"</br>";
    result+= "Wood: "+tile.wood+"</br>";
    result+= "Stone: "+tile.stone+"</br>";
    result+= "Iron: "+tile.iron+"</br>";
    result+= "Gold: "+tile.gold+"</br>";
    result+= "</br>";
    result+= "<b>Tile Info</b></br>";
    result+= "Forestation: "+tile.forestation.toFixed(2)+"</br>";
    result+= "Iron Ore: "+tile.ironOre.toFixed(2)+"</br>";
    result+= "Gold Ore: "+tile.goldOre.toFixed(2)+"</br>";
    result+= "Height: "+tile.height.toFixed(2)+"</br>";
    result+= "Rockyness: "+tile.rockyness.toFixed(2)+"</br>";
    result+= "Movementfactor: "+tile.movementFactor.toFixed(2)+"</br>";
    return result;
  }

  addListener(listener:HudListener) {
    this.listeners.push(listener);
  }

  removeListener(listener:HudListener) {
    const index = this.listeners.indexOf(listener);
    if(index > -1) {
      this.listeners.splice(index, 1);
    }
  }

}