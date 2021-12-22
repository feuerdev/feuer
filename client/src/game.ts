import { Socket } from "socket.io-client"

import Connection, { ConnectionListener } from "./connection"
import Selection, { SelectionType } from "./selection"
import Renderer from "./renderer"

import * as Vectors from "../../shared/vector2"
import Vector2 from "../../shared/vector2"
import * as Util from "../../shared/util"
import * as Hexes from "../../shared/hex"
import * as PlayerRelation from "../../shared/relation"
import Hex from "../../shared/hex"
import { Battle, Building, Group, World } from "../../shared/objects"
import { ClientTile } from "./objects"
import { getTileById } from "../../shared/objectutil"
import { Hashtable } from "../../shared/util"

export default class Game implements ConnectionListener {
  private renderer: Renderer
  private connection: Connection
  private world: World
  private uid: string
  private selection: Selection = new Selection()

  constructor(uid: string, world: World, renderer: Renderer, connection: Connection) {
    this.uid = uid
    this.world = world
    this.renderer = renderer
    this.connection = connection
  }

  //#region Incoming Events
  onConnected(_socket: Socket) {
    console.info("Connected")
  }

  onDisconnected(_socket: Socket) {
    console.info("Disonnected")
  }

  onTilesReceived(tiles: Util.Hashtable<ClientTile>): void {
    let visibleHexes: Hashtable<Hex> = {}
    Object.values(this.world.groups).forEach((group) => {
      Hexes.neighborsRange(group.pos, group.spotting).forEach((hex) => {
        visibleHexes[Hexes.hash(hex)] = hex
      })
    })
    Object.values(this.world.buildings).forEach((building) => {
      Hexes.neighborsRange(building.position, building.spotting).forEach((hex) => {
        visibleHexes[Hexes.hash(hex)] = hex
      })
    })

    Object.entries(tiles).forEach(([id, tile]) => {
      this.world.tiles[id] = tile
    })

    Object.values(this.world.tiles).forEach((tile: ClientTile) => {
      const oldVisibility = tile.visible
      tile.visible = visibleHexes[Hexes.hash(tile.hex)] !== undefined
      if (oldVisibility !== tile.visible) {
        this.renderer.updateScenegraphTile(tile)
      }
    })
  }

  onGroupsReceived(groups: Hashtable<Group>): void {
    let newGroups = {}

    let needsTileUpdate = false

    // Merge groups
    Object.entries(groups).forEach(([id, receivedGroup]) => {
      const oldGroup = this.world.groups[id]

      // Check if group is new, has moved or upgraded
      // Redraw/request tiles accordingly
      if (!oldGroup || !Hexes.equals(oldGroup.pos, receivedGroup.pos) || oldGroup.spotting !== receivedGroup.spotting) {
        this.renderer.updateScenegraphGroup(receivedGroup)
        needsTileUpdate = true
      }

      // If group is new and foreign, request relation
      if (
        !oldGroup &&
        receivedGroup.owner !== this.uid &&
        this.world.playerRelations[PlayerRelation.hash(receivedGroup.owner, this.uid)] === undefined
      ) {
        this.connection.send("request relation", {
          id1: receivedGroup.owner,
          id2: this.uid,
        })
      }

      newGroups[id] = receivedGroup
    })

    // Server is sending exhaustive list of groups, so client can clean his own list
    this.world.groups = newGroups

    if (needsTileUpdate) {
      this.requestTiles()
    }

    //Update the selection if a group is selected (it might have moved)
    if (this.selection.type === SelectionType.Group) {
      this.renderer.select(this.selection)
    }
  }

  onBattlesReceived(battles: Battle[]): void {
    this.world.battles = battles
  }

  onBuildingsReceived(buildings: Building[]): void {
    this.world.buildings = buildings
  }

  onRelationReceived(relation: PlayerRelation.default): void {
    let hash = PlayerRelation.hash(relation.id1, relation.id2)
    this.world.playerRelations[hash] = relation
  }
  //#endregion

  //#region Outgoing Messages
  requestTiles() {
    let hexes = new Set<Hex>()
    Object.values(this.world.groups).forEach((group) => {
      Hexes.neighborsRange(group.pos, group.spotting).forEach((hex) => {
        hexes.add(hex)
      })
    })
    Object.values(this.world.buildings).forEach((building) => {
      Hexes.neighborsRange(building.position, building.spotting).forEach((hex) => {
        hexes.add(hex)
      })
    })
    this.connection.send("request tiles", Array.from(hexes))
  }

  onConstructionRequested(pos: Hex, type: string) {
    this.connection.send("request construction", { pos: pos, type: type })
  }

  onDemolishRequested(id: number): void {
    this.connection.send("request demolish", { buildingId: id })
  }
  onUpgradeRequested(id: number): void {
    this.connection.send("request upgrade", { buildingId: id })
  }

  onUnitAdd(groupId: number, unitId: number) {
    this.connection.send("request unit add", {
      groupId: groupId,
      unitId: unitId,
    })
  }
  onUnitRemove(groupId: number, unitId: number) {
    this.connection.send("request unit remove", {
      groupId: groupId,
      unitId: unitId,
    })
  }

  onResourceTransfer(id: number, resource: string, amount: number): void {
    this.connection.send("request transfer", {
      id: id,
      resource: resource,
      amount: amount,
    })
  }

  onDisbandRequested(id: number): void {
    this.connection.send("request disband", { id: id })
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
            this.renderer.viewport!.center = new PIXI.Point(0, 0)
            break //R
          default:
            break
        }
      },
      false
    )

    //Mouse events
    this.renderer.viewport.on("clicked", (click) => {
      let point = Vectors.create(click.world.x, click.world.y)
      switch (click.event.data.button) {
        case 0: //Left
          this.select(point)
          break
        case 2: //Right
          let clickedHex = Hexes.round(this.renderer.layout.pixelToHex(point))
          if (clickedHex && this.selection.type === SelectionType.Group) {
            this.connection.send("request movement", {
              selection: this.selection.selectedId,
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
  private select(point: Vector2) {
    this.selection.clear()
    this.renderer.deselect()

    const hit = this.renderer.viewport.children.filter((sprite) => {
      return Util.isPointInRectangle(point.x, point.y, sprite.x, sprite.y, (<PIXI.Sprite>sprite).width, (<PIXI.Sprite>sprite).height)
    })

    for (let sprite of hit) {
      const group = this.world.groups[sprite.name]
      if (group) {
        console.log(group)
        this.selection.selectGroup(group.id)
        break
      }

      const building = this.world.buildings.find((building) => building.id === Number(sprite.name))
      if (building) {
        console.log(building)
        this.selection.selectBuilding(building.id)
        break
      }

      const hex = Hexes.round(this.renderer.layout.pixelToHex(point))
      const tile = this.world.tiles[Hexes.hash(hex)]
      if (tile) {
        console.log("Pos:", tile.hex)
        console.log("Biome:", tile.biome)
        console.log("Height:", tile.height)
        console.log("Temp:", tile.temperature)
        console.log("Precip:", tile.precipitation)
        this.selection.selectTile(tile.id)
      }
    }

    this.renderer.select(this.selection)
  }
}
//#endregion
