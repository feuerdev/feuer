import { Socket } from "socket.io-client"

import Connection, { ConnectionListener } from "./connection"
import Selection from "./selection"
import Renderer, { RendererListener } from "./renderer"

import * as Vectors from "../../shared/vector2"
import Vector2 from "../../shared/vector2"
import * as Util from "../../shared/util"
import * as Hexes from "../../shared/hex"
import * as PlayerRelation from "../../shared/relation"
import Hex from "../../shared/hex"
import { Group, World } from "../../shared/objects"
import { ClientTile } from "./objects"
import { getTileById } from "../../shared/objectutil"

export default class Game implements ConnectionListener, RendererListener {
  private selection: Selection = new Selection()
  private renderer: Renderer = new Renderer()
  private connection?: Connection
  private world?: World = {
    tiles: {},
    groups: [],
    units: [],
    buildings: [],
    playerRelations: {},
    battles: [],
  }
  private uid: string

  private initialFocusSet = false

  constructor(uid: string) {
    this.uid = uid
    this.renderer.selection = this.selection
    this.renderer.addListener(this)

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
    console.info("Client ready")
  }

  select(point: Vector2) {
    this.selection.clear()
    this.renderer.deselect()

    const hit = this.renderer.viewport.children.filter((sprite) => {
      return Util.isPointInRectangle(
        point.x,
        point.y,
        sprite.x,
        sprite.y,
        (<PIXI.Sprite>sprite).width,
        (<PIXI.Sprite>sprite).height
      )
    })

    for (let sprite of hit) {
      const group = this.world.groups.find(
        (group) => group.id === Number(sprite.name)
      )
      if (group) {
        this.selection.selectGroup(group.id)
        break
      }

      const building = this.world.buildings.find(
        (building) => building.id === Number(sprite.name)
      )
      if (building) {
        this.selection.selectBuilding(building.id)
        break
      }

      const tile = getTileById(Number(sprite.name), this.world.tiles)
      if (tile) {
        this.selection.selectTile(tile.id)
      }
    }

    this.renderer.select(this.selection)
  }

  onRendererLoaded(): void {
    //Only connect after renderer is loaded //TODO: why?
    this.connection = new Connection(`${window.location.host}`, this.uid)
    this.connection.addListener(this)

    this.renderer.viewport?.on("clicked", (click) => {
      let point = Vectors.create(click.world.x, click.world.y)
      switch (click.event.data.button) {
        case 0: //Left
          this.select(point)
          break
        case 2: //Right
          let clickedHex = Hexes.round(this.renderer.layout.pixelToHex(point))
          if (clickedHex) {
            this.connection?.send("request movement", {
              selection: this.selection.selectedGroup,
              target: clickedHex,
            })
          }
          break
      }
    })
  }

  onConstructionRequested(pos: Hex, type: string) {
    this.connection?.send("request construction", { pos: pos, type: type })
  }

  onDemolishRequested(id: number): void {
    this.connection?.send("request demolish", { buildingId: id })
  }
  onUpgradeRequested(id: number): void {
    this.connection?.send("request upgrade", { buildingId: id })
  }

  onUnitAdd(groupId: number, unitId: number) {
    this.connection?.send("request unit add", {
      groupId: groupId,
      unitId: unitId,
    })
  }
  onUnitRemove(groupId: number, unitId: number) {
    this.connection?.send("request unit remove", {
      groupId: groupId,
      unitId: unitId,
    })
  }

  onResourceTransfer(id: number, resource: string, amount: number): void {
    this.connection?.send("request transfer", {
      id: id,
      resource: resource,
      amount: amount,
    })
  }

  onDisbandRequested(id: number): void {
    this.connection?.send("request disband", { id: id })
  }

  onConnected(socket: Socket) {
    console.info("Connected")
  }
  onDisconnected(socket: Socket) {
    console.info("Disonnected")
  }
  onSetup(socket: Socket) {
    //Hier alle Gamelevel Events implementieren
    socket.on("gamestate tiles", (data) => {
      for (let property in this.world.tiles) {
        if (this.world.tiles.hasOwnProperty(property)) {
          const tile = this.world.tiles[property] as ClientTile
          tile.visible = false
          this.renderer.updateScenegraphTile(
            this.world.tiles[property] as ClientTile
          ) //PERF: Only update Tint here instead of whole tile
        }
      }
      for (let property in data) {
        if (data.hasOwnProperty(property)) {
          data[property].visible = true
          this.world.tiles[property] = data[property]
          this.renderer.updateScenegraphTile(
            this.world.tiles[property] as ClientTile
          )
        }
      }
    })
    socket.on("gamestate discovered tiles", (data) => {
      for (let property in data) {
        if (data.hasOwnProperty(property)) {
          this.world.tiles[property] = data[property]
          this.renderer.updateScenegraphTile(
            this.world.tiles[property] as ClientTile
          )
        }
      }
    })
    socket.on("gamestate groups", (data) => {
      this.world.groups = data
      if (!this.initialFocusSet) {
        this.initialFocusSet = true
        this.stopLoading()
        let ref = this.world.groups[0]
        if (ref) {
          this.renderer.centerOn(ref.pos)
        }
      }
      for (let group of this.world.groups) {
        this.renderer.updateScenegraphGroup(group)
        if (group.owner !== this.uid) {
          if (
            this.world.playerRelations[
              PlayerRelation.hash(group.owner, this.uid)
            ] === undefined
          ) {
            this.connection?.send("request relation", {
              id1: group.owner,
              id2: this.uid,
            })
          }
        }
      }

      //Update the selection if a group is selected (it might have moved)
      if (this.selection.isGroup) {
        this.renderer.select(this.selection)
      }
    })
    socket.on("gamestate battles", (data) => {
      this.world.battles = data
    })
    socket.on("gamestate buildings", (data) => {
      this.world.buildings = data
    })
    socket.on("gamestate relation", (data) => {
      let hash = PlayerRelation.hash(data.id1, data.id2)
      this.world.playerRelations[hash] = data
    })
  }

  getHex(vector: Vector2): Hex {
    return Hexes.round(this.renderer.layout.pixelToHex(vector))
  }

  getTile(hex: Hex): ClientTile {
    return this.world[Hexes.hash(hex)]
  }

  getGroup(id: number): Group | undefined {
    return this.world.groups.find((group) => {
      group.id === id
    })
  }

  startLoading() {
    document.querySelector(".loading")?.classList.remove("hidden")
  }

  stopLoading() {
    document.querySelector(".loading")?.classList.add("hidden")
  }
}
