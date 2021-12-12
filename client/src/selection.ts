export default class Selection {
  selectedId?: number

  isGroup: boolean
  isBuilding: boolean
  isTile: boolean

  clear(): void {
    this.selectedId = undefined
    this.isBuilding = false
    this.isGroup = false
    this.isTile = false
  }

  selectGroup(id: number): void {
    this.clear()
    this.selectedId = id
    this.isGroup = true
  }

  selectBuilding(id: number): void {
    this.clear()
    this.selectedId = id
    this.isBuilding = true
  }

  selectTile(id: number): void {
    this.clear()
    this.selectedId = id
    this.isTile = true
  }
}
