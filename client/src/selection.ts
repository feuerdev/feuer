export enum SelectionType {
  None = 0,
  Group = 1,
  Tile = 2,
  Building = 3,
}

export default class Selection {
  selectedId?: number
  type: SelectionType = SelectionType.None

  clear(): void {
    this.selectedId = undefined
    this.type = SelectionType.None
  }

  selectGroup(id: number): void {
    this.clear()
    this.selectedId = id
    this.type = SelectionType.Group
  }

  selectBuilding(id: number): void {
    this.clear()
    this.selectedId = id
    this.type = SelectionType.Building
  }

  selectTile(id: number): void {
    this.clear()
    this.selectedId = id
    this.type = SelectionType.Tile
  }
}
