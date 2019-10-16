import { InputListener } from "./input";
import * as $ from "./lib/jquery-3.1.1.min";
import Hex from "../../shared/hex";

export interface HudListener {

}

enum EnumTab {
  tabBuildings,
  tabUnits
}

export default class Hud implements InputListener {
  
  onHexSelected(selectedHex: Hex):void {
    this.updateSelection();
    this.updateConstruction();
  }

  private btnConstructionBuildings;
  private btnConstructionUnits;
  private btnSelectionBuildings;
  private btnSelectionUnits;

  private tabConstruction: EnumTab = EnumTab.tabBuildings;
  private tabSelection: EnumTab = EnumTab.tabBuildings;

  private readonly listeners:InputListener[] = [];

  constructor() {
    this.btnConstructionBuildings = $("#button-construction-buildings");
    this.btnConstructionUnits = $("#button-construction-units");
    this.btnSelectionBuildings = $("#button-selection-buildings");
    this.btnSelectionUnits = $("#button-selection-units");

    this.btnConstructionBuildings.click(()=>this.onConstructionTabSelected(EnumTab.tabBuildings))
    this.btnConstructionUnits.click(()=>this.onConstructionTabSelected(EnumTab.tabUnits))

    this.btnSelectionBuildings.click(()=>this.onSelectionTabSelected(EnumTab.tabBuildings))
    this.btnSelectionUnits.click(()=>this.onSelectionTabSelected(EnumTab.tabUnits))
  }

  onConstructionTabSelected(tab: EnumTab): any {
    this.tabConstruction = tab;
    this.updateConstruction();
  }

  onSelectionTabSelected(tab: EnumTab): any {
    this.tabSelection = tab;
    this.updateSelection();
  }

  updateConstruction() {
    switch(this.tabConstruction) {
      case EnumTab.tabBuildings:
          $("#content-construction-buildings").show(); 
          $("#content-construction-units").hide(); 
        break;
      case EnumTab.tabUnits:
          $("#content-construction-units").show(); 
          $("#content-construction-buildings").hide();
        break;
      default: break;
    }
  }
  
  updateSelection() {
    switch(this.tabSelection) {
      case EnumTab.tabBuildings:
          $("#content-selection-buildings").show(); 
          $("#content-selection-units").hide(); 
        break;
      case EnumTab.tabUnits:
          $("#content-selection-units").show(); 
          $("#content-selection-buildings").hide();
        break;
      default: break;
    }
  }

  addListener(listener:InputListener) {
    this.listeners.push(listener);
  }

  removeListener(listener:InputListener) {
    const index = this.listeners.indexOf(listener);
    if(index > -1) {
      this.listeners.splice(index, 1);
    }
  }

}