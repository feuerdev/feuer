import Hex from "../../shared/hex";

export default class Selection {

  public selectedGroup:number = null;
  public selectedBuilding:number = null;
  public selectedHex:Hex = null;

  isGroup():boolean {
    return this.selectedGroup !== null;
  }

  isBuilding(): boolean {
    return this.selectedBuilding !== null;
  }

  isHex(): boolean {
    return this.selectedHex !== null;
  }

  clearSelection():void {
    this.selectedBuilding = null;
    this.selectedGroup = null;
    this.selectedHex = null;
  }

  selectGroup(group:number):void {
    this.clearSelection();
    this.selectedGroup = group;
  }

  selectBuilding(building:number):void {
    this.clearSelection();
    this.selectedBuilding = building;
  }

  selectHex(hex:Hex):void {
    this.clearSelection();
    this.selectedHex = hex;
  }
}