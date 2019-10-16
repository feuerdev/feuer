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

  private hudConstruction;

  private tabConstruction: EnumTab = EnumTab.tabBuildings;
  private tabSelection: EnumTab = EnumTab.tabBuildings;

  private readonly listeners:InputListener[] = [];

  constructor() {

  }

  updateConstruction() {
    throw new Error("Method not implemented.");
  }
  
  updateSelection() {
    throw new Error("Method not implemented.");
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