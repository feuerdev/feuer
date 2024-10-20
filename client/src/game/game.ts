import Selection, { SelectionType } from "./selection"
import Renderer from "./renderer"

import Vector2, { create } from "../../../shared/vector2"
import * as Util from "../../../shared/util"
import * as PlayerRelation from "../../../shared/relation"
import Hex, { equals, hash, neighborsRange, round } from "../../../shared/hex"
import { Battle, Building, Group, Tile, World } from "../../../shared/objects"
import { ClientTile } from "./objects"
import { Hashtable } from "../../../shared/util"
import EventBus from "./eventbus"
import { Point, Sprite } from "pixi.js"
import { store } from "../store/store"
import { select } from "../store/selection"

export default class GameClass {
  private renderer: Renderer
  world: World
  uid: string
  selection: Selection = new Selection()

  constructor(uid: string, world: World, renderer: Renderer) {
    this.uid = uid
    this.world = world
    this.renderer = renderer

    EventBus.shared().on("gamestate tiles", (detail) => {
      const tiles: Util.Hashtable<ClientTile> =
        detail as unknown as Util.Hashtable<ClientTile>
      const visibleHexes: Hashtable<Hex> = {}
      Object.values(this.world.groups).forEach((group) => {
        neighborsRange(group.pos, group.spotting).forEach((hex) => {
          visibleHexes[hash(hex)] = hex
        })
      })
      Object.values(this.world.buildings).forEach((building) => {
        neighborsRange(building.position, building.spotting).forEach((hex) => {
          visibleHexes[hash(hex)] = hex
        })
      })

      Object.entries(tiles).forEach(([id, tile]) => {
        this.world.tiles[id] = tile
      })

      Object.values(this.world.tiles).forEach((tile: Tile) => {
        const cTile = tile as ClientTile
        const oldVisibility = cTile.visible
        cTile.visible = visibleHexes[hash(tile.hex)] !== undefined
        if (oldVisibility !== cTile.visible) {
          this.renderer.updateScenegraphTile(cTile)
        }
      })

      store.dispatch({ type: "REFRESH_SELECTION" })
    })

    EventBus.shared().on("gamestate group", (group: Group) => {
      this.world.groups[group.id] = group
      store.dispatch({ type: "REFRESH_SELECTION" })
    })

    EventBus.shared().on("gamestate groups", (data) => {
      const groups: Hashtable<Group> = data as unknown as Hashtable<Group>
      const newGroups: Hashtable<Group> = {}
      const visitedOldGroups: Hashtable<boolean> = {}

      let needsTileUpdate = false

      // Merge groups
      Object.values(groups).forEach((receivedGroup) => {
        const oldGroup = this.world.groups[receivedGroup.id]
        visitedOldGroups[receivedGroup.id] = true
        // Check if group is new, has moved or upgraded
        // Redraw/request tiles accordingly
        if (
          !oldGroup ||
          !equals(oldGroup.pos, receivedGroup.pos) ||
          oldGroup.spotting !== receivedGroup.spotting
        ) {
          this.renderer.updateScenegraphGroup(receivedGroup)
          needsTileUpdate = true
        }

        // If group is new and foreign, request relation
        if (
          !oldGroup &&
          receivedGroup.owner !== this.uid &&
          this.world.playerRelations[
            PlayerRelation.hash(receivedGroup.owner, this.uid)
          ] === undefined
        ) {
          window.dispatchEvent(
            new CustomEvent("request relation", {
              detail: {
                id1: receivedGroup.owner,
                id2: this.uid,
              },
            })
          )
        }

        newGroups[receivedGroup.id] = receivedGroup
      })

      // Remove groups that are not in the new list
      Object.entries(this.world.groups).forEach(([id, oldGroup]) => {
        if (!visitedOldGroups[id]) {
          this.renderer.removeItem(oldGroup.id)
          needsTileUpdate = true
        }
      })

      // Server is sending exhaustive list of groups, so client can clean his own list
      this.world.groups = newGroups

      if (needsTileUpdate) {
        this.requestTiles()
      }

      //Update the selection if a group is selected (it might have moved)
      if (this.selection.type === SelectionType.Group) {
        this.renderer.updateSelection(this.selection)
      }
      store.dispatch({ type: "REFRESH_SELECTION" })
    })

    EventBus.shared().on("gamestate battles", (detail) => {
      const battles: Battle[] = detail as unknown as Battle[]
      this.world.battles = battles
    })

    EventBus.shared().on("gamestate buildings", (detail) => {
      const buildings: Hashtable<Building> =
        detail as unknown as Hashtable<Building>
      const newBuildings: Hashtable<Building> = {}
      const visitedOldBuildings: Hashtable<boolean> = {}

      let needsTileUpdate = false

      // Merge buildings
      Object.values(buildings).forEach((receivedBuilding) => {
        const oldBuilding = this.world.buildings[receivedBuilding.id]
        visitedOldBuildings[receivedBuilding.id] = true
        // Check if Building is new or upgraded
        // Redraw/request tiles accordingly
        if (
          !oldBuilding ||
          oldBuilding.spotting !== receivedBuilding.spotting
        ) {
          this.renderer.updateScenegraphBuilding(receivedBuilding)
          needsTileUpdate = true
        }

        // If building is new and foreign, request relation
        if (
          !oldBuilding &&
          receivedBuilding.owner !== this.uid &&
          this.world.playerRelations[
            PlayerRelation.hash(receivedBuilding.owner, this.uid)
          ] === undefined
        ) {
          window.dispatchEvent(
            new CustomEvent("request relation", {
              detail: {
                id1: receivedBuilding.owner,
                id2: this.uid,
              },
            })
          )
        }

        newBuildings[receivedBuilding.id] = receivedBuilding
      })

      // Remove buildings that are not in the new list
      Object.entries(this.world.buildings).forEach(([id, oldBuilding]) => {
        if (!visitedOldBuildings[id]) {
          this.renderer.removeItem(oldBuilding.id)
          needsTileUpdate = true
        }
      })

      // Server is sending exhaustive list of buildings, so client can clean his own list
      this.world.buildings = newBuildings

      if (needsTileUpdate) {
        this.requestTiles()
      }

      //Update the selection if a building is selected (it might have updated)
      if (this.selection.type === SelectionType.Building) {
        this.renderer.updateSelection(this.selection)
      }
      store.dispatch({ type: "REFRESH_SELECTION" })
    })

    EventBus.shared().on("gamestate relation", (detail) => {
      const relation: PlayerRelation.default =
        detail as unknown as PlayerRelation.default
      const hash = PlayerRelation.hash(relation.id1, relation.id2)
      this.world.playerRelations[hash] = relation
    })
    this.registerEventListeners()
  }

  //#region Outgoing Messages
  requestTiles() {
    const hexes = new Set<Hex>()
    Object.values(this.world.groups).forEach((group) => {
      if (group.owner !== this.uid) return // Only request tiles for own groups
      neighborsRange(group.pos, group.spotting).forEach((hex) => {
        hexes.add(hex)
      })
    })
    Object.values(this.world.buildings).forEach((building) => {
      if (building.owner !== this.uid) return // Only request tiles for own buildings
      neighborsRange(building.position, building.spotting).forEach((hex) => {
        hexes.add(hex)
      })
    })
    EventBus.shared().emitSocket("request tiles", Array.from(hexes))
  }

  onConstructionRequested(pos: Hex, type: string) {
    EventBus.shared().emitSocket("request construction", {
      pos: pos,
      type: type,
    })
  }

  onDemolishRequested(id: number): void {
    EventBus.shared().emitSocket("request demolish", { buildingId: id })
  }

  onUpgradeRequested(id: number): void {
    EventBus.shared().emitSocket("request upgrade", { buildingId: id })
  }

  onUnitAdd(groupId: number, unitId: number) {
    EventBus.shared().emitSocket("request unit add", {
      groupId: groupId,
      unitId: unitId,
    })
  }

  onResourceTransfer(id: number, resource: string, amount: number): void {
    EventBus.shared().emitSocket("request transfer", {
      id: id,
      resource: resource,
      amount: amount,
    })
  }

  onDisbandRequested(id: number): void {
    EventBus.shared().emitSocket("request transfer", { id: id })
  }
  //#endregion

  //#region Input Events
  registerEventListeners() {
    //Keyboard events
    window.addEventListener(
      "keyup",
      (event) => {
        switch (event.keyCode) {
          case 187:
            this.renderer.viewport?.zoom(-200, true)
            break //+
          case 189:
            this.renderer.viewport?.zoom(200, true)
            break //-
          case 191:
            this.renderer.viewport?.setZoom(1, true)
            break //#
          case 82:
            this.renderer.viewport!.center = new Point(0, 0)
            break //R
          default:
            break
        }
      },
      false
    )

    //Mouse events
    this.renderer.viewport.on("clicked", (click) => {
      const point = create(click.world.x, click.world.y)
      switch (click.event.data.button) {
        case 0: //Left
          this.trySelect(point)
          break
        case 2: //Right
          const clickedHex = round(this.renderer.layout.pixelToHex(point))
          if (clickedHex && this.selection.type === SelectionType.Group) {
            EventBus.shared().emitSocket("request movement", {
              selection: this.selection.id,
              target: clickedHex,
            })
          }
          break
      }
    })
  }

  /**
   * 1. Deselect previous selection
   * 2. Select new object based on given point
   * 3. Update renderer to show selection
   * @param point
   */
  private trySelect(point: Vector2) {
    this.selection.clear()

    const hit = this.renderer.viewport.children.filter((sprite) => {
      return Util.isPointInRectangle(
        point.x,
        point.y,
        sprite.x,
        sprite.y,
        (<Sprite>sprite).width,
        (<Sprite>sprite).height
      )
    })

    for (const sprite of hit) {
      const group =
        this.world.groups[Util.convertSpriteNameToObjectId(sprite.name, "g")]
      if (group) {
        this.selection.selectGroup(group.id)
        break
      }

      const building =
        this.world.buildings[Util.convertSpriteNameToObjectId(sprite.name, "b")]
      if (building) {
        this.selection.selectBuilding(building.id)
        break
      }

      const hex = round(this.renderer.layout.pixelToHex(point))
      const tile = this.world.tiles[hash(hex)]
      if (tile) {
        this.selection.selectTile(tile.id)
      }
    }
    // Update Canvas
    this.renderer.updateSelection(this.selection)
    // Update HUD
    store.dispatch(select(this.selection))
  }
}
//#endregion
