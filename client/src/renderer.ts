import { Viewport } from "pixi-viewport"
import { GlowFilter } from "pixi-filters"
import * as PIXI from "pixi.js"
import Hex, { Layout } from "../../shared/hex"
import * as Vector2 from "../../shared/vector2"
import * as Rules from "../../shared/rules.json"
import { ClientTile } from "./objects"
import { Biome, Group } from "../../shared/objects"
import Selection, { SelectionType } from "./selection"
import Sprites from "./sprites.json"

const HEX_SIZE = 40

enum ZIndices {
  Background = 0,
  Tiles = 1,
  TileSelection = 2,
  Nature = 3,
  Buildings = 4,
  BuildingsSelection = 5,
  Units = 6,
  UnitsSelection = 7,
}

export default class Renderer {
  private canvas_map = <HTMLCanvasElement>document.querySelector("#canvas-map")
  private loader: PIXI.Loader
  private pixi: PIXI.Renderer = new PIXI.Renderer({
    view: this.canvas_map,
    width: window.innerWidth,
    height: window.innerHeight,
    resolution: window.devicePixelRatio,
    autoDensity: true,
  })
  public viewport: Viewport = new Viewport({
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    worldWidth: (Rules.settings.map_size * 2 + 1) * HEX_SIZE,
    worldHeight: (Rules.settings.map_size * 2 + 1) * HEX_SIZE,
    interaction: this.pixi.plugins.interaction, // the interaction module is important for wheel() to work properly when renderer.view is placed or scaled
  })
    .clampZoom({
      maxScale: 2,
      minScale: 0.2,
    })
    .drag()
    .pinch()
    .wheel()
    .decelerate()
  public layout: Layout = new Layout(Layout.pointy, Vector2.create(HEX_SIZE, HEX_SIZE), Vector2.create(0, 0))

  // Zoom to the first group received
  private initialFocusSet = false

  static GLOWFILTER = new GlowFilter({ distance: 15, outerStrength: 2 })

  constructor() {
    //Make sure zIndex will be respected
    this.viewport.sortableChildren = true

    window.addEventListener("resize", () => {
      this.pixi.resize(window.innerWidth, window.innerHeight)
      if (this.viewport) {
        this.viewport.dirty = true
      }
    })
  }

  load(): Promise<void> {
    return new Promise((resolve, _reject) => {
      this.loader = PIXI.Loader.shared
      for (let key of Sprites) {
        this.loader.add(key, `../img/${key}.png`)
      }
      this.loader.load(() => {
        PIXI.Ticker.shared.add(() => {
          if (this.viewport?.dirty) {
            this.pixi.render(this.viewport)
            this.viewport.dirty = false
          }
        })
        resolve()
      })
    })
  }

  select(selection: Selection) {
    const original = this.viewport.getChildByName(String(selection.selectedId)) as PIXI.Sprite
    if (!original) {
      return
    }

    let sprite = this.viewport.getChildByName("selection") as PIXI.Sprite
    if (!sprite) {
      sprite = new PIXI.Sprite(original.texture)
      sprite.name = "selection"
      this.viewport.addChild(sprite)
    }

    sprite.position.set(original.position.x, original.position.y)
    sprite.zIndex = getSelectionZIndex(selection)
    sprite.width = original.width
    sprite.height = original.height
    sprite.filters = [Renderer.GLOWFILTER]

    this.viewport.dirty = true
  }

  deselect() {
    let sprite = this.viewport.getChildByName("selection") as PIXI.Graphics
    this.viewport.removeChild(sprite)
    this.viewport.dirty = true
  }

  updateScenegraphGroup(group: Group) {
    if (!this.initialFocusSet) {
      this.initialFocusSet = true
      this.centerOn(group.pos)
    }
    this.viewport.dirty = true
    let object = this.viewport.getChildByName(String(group.id)) as PIXI.Sprite
    if (!object) {
      object = new PIXI.Sprite(this.getGroupSprite(group))
      object.name = String(group.id)
      object.scale = new PIXI.Point(0.5, 0.5)
      this.viewport.addChild(object)
    }

    object.x = this.layout.hexToPixel(group.pos).x - HEX_SIZE / 3
    object.y = this.layout.hexToPixel(group.pos).y + HEX_SIZE / 3
    object.zIndex = ZIndices.Units
  }

  updateScenegraphTile(tile: ClientTile) {
    this.viewport.dirty = true
    let object = this.viewport.getChildByName(String(tile.id)) as PIXI.Sprite
    if (!object) {
      object = new PIXI.Sprite(this.getTerrainTexture(tile))
      this.viewport.addChild(object)

      let corners = this.layout.polygonCorners(tile.hex)
      let padding = 10

      object.zIndex = ZIndices.Tiles
      object.name = String(tile.id)
      object.x = corners[3]!.x + padding //obere linke ecke
      object.y = corners[3]!.y - this.layout.size.y / 2 + padding //obere linke ecke- halbe höhe
      object.width = this.layout.size.x * Math.sqrt(3) - padding
      object.height = this.layout.size.y * 2 - padding
    }

    let tint = tile.visible ? 0xdddddd : 0x555555

    object.tint = tint

    //TODO: Rewrite Client side
    // for (let i = 0; i < tile.environmentSpots.length; i++) {
    //   let spot = tile.environmentSpots[i]
    //   let texture = spot.texture
    //   let img = new PIXI.Sprite(this.loader.resources[texture]!.texture)
    //   let pos = spot.pos
    //   img.x = this.layout.hexToPixel(hex).x + pos.x
    //   img.y = this.layout.hexToPixel(hex).y + pos.y
    //   img.tint = tint
    //   img.name = spot.id
    //   if (
    //     this.selection?.isBuilding() &&
    //     this.selection.selectedBuilding === spot.id
    //   ) {
    //     img.filters = [Renderer.GLOWFILTER]
    //   }
    //   if (this.selection?.selectedGroup === spot.id) {
    //     img.filters = [Renderer.GLOWFILTER]
    //   }
    //   container.addChild(img)
    // }

    // let old = this.viewport.getChildByName(Hexes.hash(tile.hex))
    // if (old) {
    //   this.viewport?.removeChild(old)
    // }
    // this.viewport?.addChild(container)
    // this.viewport!.dirty = true
  }

  centerOn(pos: Hex) {
    let x = this.layout.hexToPixel(pos).x
    let y = this.layout.hexToPixel(pos).y
    this.viewport.center = new PIXI.Point(x, y)
  }

  getTerrainTexture(tile: ClientTile): PIXI.Texture {
    switch (tile.biome) {
      case Biome.Ice:
        return this.getRandomTile(tile, "biome_ice", 1)
      case Biome.Tundra:
        return this.getRandomTile(tile, "biome_tundra", 8)
      case Biome.Boreal:
        return this.getRandomTile(tile, "biome_boreal_forest", 4)
      case Biome.Temperate:
        return this.getRandomTile(tile, "biome_temperate_forest", 4)
      case Biome.Tropical:
        return this.getRandomTile(tile, "biome_tropical_forest", 2)
      case Biome.Grassland:
        return this.getRandomTile(tile, "biome_grassland", 2)
      case Biome.Desert:
        return this.getRandomTile(tile, "biome_desert", 8)
      case Biome.Ocean:
        return this.getRandomTile(tile, "biome_ocean", 1)
      case Biome.Shore:
        return this.getRandomTile(tile, "biome_shore", 1)
      case Biome.Treeline:
        return this.getRandomTile(tile, "biome_tree_line", 3)
      case Biome.Mountain:
        return this.getRandomTile(tile, "biome_mountain", 4)
      case Biome.Beach:
        return this.getRandomTile(tile, "biome_beach", 1)
      case Biome.Peaks:
        return this.getRandomTile(tile, "biome_ice_peaks", 3)
      case Biome.River:
        return this.getRandomTile(tile, "biome_river", 1)
      default:
        return this.getRandomTile(tile, "biome_ice", 1)
    }
  }

  getRandomTile(tile: ClientTile, name: string, max: number) {
    //Hash a random number between 0 and max based on the tile id (1 indexed)
    let texture: PIXI.Texture = null
    if (max === 1) {
      texture = this.loader.resources[name]!.texture
    } else {
      let hash = (Math.abs(tile.id) % max) + 1
      texture = this.loader.resources[`${name}_${hash}`]!.texture
    }

    // Mirror the texture if id is even for more diversity
    if (Math.abs(tile.hex.s) % 2 === 1) {
      texture = new PIXI.Texture(texture.baseTexture, texture.frame, texture.orig, texture.trim, 12)
    }

    return texture
  }

  getGroupSprite(_group: Group): PIXI.Texture {
    return this.loader.resources["unit_scout_own"].texture
  }
}

function getSelectionZIndex(selection: Selection): number {
  if (selection.type === SelectionType.Group) {
    return ZIndices.UnitsSelection
  } else if (selection.type === SelectionType.Building) {
    return ZIndices.BuildingsSelection
  } else if (selection.type === SelectionType.Tile) {
    return ZIndices.TileSelection
  } else {
    throw new Error("Unknown selection type")
  }
}
