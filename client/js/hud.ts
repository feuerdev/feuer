import { InputListener } from "./input";
import * as $ from "./lib/jquery-3.1.1.min";
import * as GameData from "../../shared/gamedata";

export interface HudListener {

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

  // private tabConstruction: EnumTab = EnumTab.tabBuildings;
  // private tabSelection: EnumTab = EnumTab.tabBuildings;

  private readonly listeners:HudListener[] = [];

  constructor() {
    this.divConstruction = $(".hud-left");
    this.divSelection = $(".hud-right");

    this.btnConstructionBuildings = $("#button-construction-buildings");
    this.btnConstructionUnits = $("#button-construction-units");
    this.btnSelectionBuildings = $("#button-selection-buildings");
    this.btnSelectionUnits = $("#button-selection-units");

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
      clone.children('#construction-template-button').click(function(){
        console.log(GameData.buildings[i].name+" clicked");
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

  showSelectionHud() {
    this.divSelection.show();
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