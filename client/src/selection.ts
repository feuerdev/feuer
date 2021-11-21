import Hex from "../../shared/hex"

export default class Selection {
  public selectedGroup?: number = undefined
  public selectedBuilding?: number = undefined
  public selectedHex?: Hex = undefined

  isGroup(): boolean {
    return this.selectedGroup !== undefined
  }

  isBuilding(): boolean {
    return this.selectedBuilding !== undefined
  }

  isHex(): boolean {
    return this.selectedHex !== undefined
  }

  clearSelection(): void {
    this.selectedBuilding = undefined
    this.selectedGroup = undefined
    this.selectedHex = undefined
  }

  selectGroup(group: number): void {
    this.clearSelection()
    this.selectedGroup = group
  }

  selectBuilding(building: number): void {
    this.clearSelection()
    this.selectedBuilding = building
  }

  selectHex(hex: Hex): void {
    this.clearSelection()
    this.selectedHex = hex
  }
}