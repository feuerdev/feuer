import { Viewport } from "pixi-viewport"
import { GlowFilter } from "pixi-filters"
import * as PIXI from "pixi.js"
import Selection from "./selection"
import Hex, { Layout } from "../../shared/hex"
import * as Vector2 from "../../shared/vector2"
import * as Rules from "../../shared/rules.json"
import * as Hexes from "../../shared/hex"
import Tile from "../../shared/tile"
import { ClientTile } from "./objects"
import { Group } from "../../shared/objects"

export interface RendererListener {
  onRendererLoaded(): void
}

const HEX_SIZE = 40

export default class Renderer {
  private readonly listeners: RendererListener[] = []

  private loader: PIXI.Loader
  /**
   * The Pixi Renderer Object
   */
  private pixi: PIXI.Renderer
  public viewport?: Viewport
  public layout: Layout
  public selection?: Selection

  static GLOWFILTER = new GlowFilter({ distance: 15, outerStrength: 2 })

  private canvas_map = <HTMLCanvasElement>document.querySelector("#canvas-map")

  constructor() {
    this.layout = new Layout(
      Layout.pointy,
      Vector2.create(HEX_SIZE, HEX_SIZE),
      Vector2.create(0, 0)
    )
    this.pixi = new PIXI.Renderer({
      view: this.canvas_map,
      width: window.innerWidth,
      height: window.innerHeight,
      resolution: window.devicePixelRatio,
      autoDensity: true,
    })

    window.addEventListener("resize", () => {
      this.pixi.resize(window.innerWidth, window.innerHeight)
      if (this.viewport) {
        this.viewport.dirty = true
      }
    })

    this.loader = PIXI.Loader.shared
      .add("terrain_water_deep", "../img/water_02.png")
      .add("terrain_water_shallow", "../img/water_01.png")
      .add("terrain_sand", "../img/sand_07.png")
      .add("terrain_sand_grassy", "../img/sand_09.png")
      .add("terrain_grass_sandy", "../img/grass_07.png")
      .add("terrain_grass", "../img/grass_05.png")
      .add("terrain_grass_dirty", "../img/grass_06.png")
      .add("terrain_dirt_grassy", "../img/dirt_07.png")
      .add("terrain_dirt", "../img/dirt_06.png")
      .add("terrain_dirt_stony", "../img/dirt_10.png")
      .add("terrain_stone_dirty", "../img/stone_09.png")
      .add("terrain_stone", "../img/stone_07.png")
      .add("terrain_ice", "../img/ice_01.png")
      .add("treeSmall", "../img/tree_small.png")
      .add("treeBig", "../img/tree_big.png")
      .add("cactus1", "../img/cactus_01.png")
      .add("cactus2", "../img/cactus_02.png")
      .add("treeFirSmall", "../img/fir_small.png")
      .add("treeFirBig", "../img/fir_big.png")
      .add("treeFullFirSmall", "../img/fullfir_small.png")
      .add("treeFullFirBig", "../img/fullfir_big.png")
      .add("treeFirSnow", "../img/fir_snow.png")
      .add("rock01", "../img/rock_01.png")
      .add("rock02", "../img/rock_02.png")
      .add("rock04", "../img/rock_04.png")
      .add("rock05", "../img/rock_05.png")
      .add("iron", "../img/iron.png")
      .add("gold", "../img/gold.png")
      .add("town_center", "../img/town_center.png")
      .add("forester_hut", "../img/forester_hut.png")
      .add("quarry_hut", "../img/mine.png")
      .add("iron_hut", "../img/mine.png")
      .add("gold_mine", "../img/mine.png")
      .add("unit_scout_own", "../img/unit_scout_own.png")
      .add("mine", "../img/mine.png") //This one shouldn't be here
      .load(() => this.loaded())
  }

  loaded() {
    // create viewport
    this.viewport = new Viewport({
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      worldWidth: (Rules.settings.map_size * 2 + 1) * HEX_SIZE,
      worldHeight: (Rules.settings.map_size * 2 + 1) * HEX_SIZE,
      interaction: this.pixi.plugins.interaction, // the interaction module is important for wheel() to work properly when renderer.view is placed or scaled
    })

    // activate plugins
    this.viewport
      .clampZoom({
        maxScale: 2,
        minScale: 0.2,
      })
      .drag()
      .pinch()
      .wheel()
      .decelerate()

    //Make sure zIndex will be respected
    this.viewport.sortableChildren = true

    PIXI.Ticker.shared.add(() => {
      if (this.viewport?.dirty) {
        this.pixi.render(this.viewport)
        this.viewport.dirty = false
      }
    })

    this.listeners.forEach((l) => l.onRendererLoaded())
  }

  updateScenegraphGroup(group: Group) {
    this.viewport.dirty = true
    let object = this.viewport.getChildByName(String(group.id)) as PIXI.Sprite
    if (!object) {
      object = new PIXI.Sprite(this.getGroupSprite(group))
      object.name = String(group.id)
      this.viewport.addChild(object)
    }

    object.x = this.layout.hexToPixel(group.pos).x
    object.y = this.layout.hexToPixel(group.pos).y
    object.zIndex = 5
  }

  updateScenegraphTile(tile: ClientTile) {
    this.viewport.dirty = true
    let object = this.viewport.getChildByName(
      String(Hexes.hash(tile.hex))
    ) as PIXI.Sprite
    if (!object) {
      object = new PIXI.Sprite(this.getTerrainTexture(tile.height))
      this.viewport.addChild(object)
    }

    let corners = this.layout.polygonCorners(tile.hex)
    let padding = 10

    // let container = new PIXI.Container()
    object.zIndex = 2
    object.name = Hexes.hash(tile.hex)

    let tint = tile.visible ? 0xdddddd : 0x555555
    if (
      this.selection.selectedHex &&
      Hexes.equals(this.selection?.selectedHex, tile.hex)
    ) {
      tile.visible ? (tint = 0xffffff) : (tint += 0x333333)
    }

    object.tint = tint
    object.x = corners[3]!.x + padding //obere linke ecke
    object.y = corners[3]!.y - this.layout.size.y / 2 + padding //obere linke ecke- halbe höhe
    object.width = this.layout.size.x * Math.sqrt(3) - padding
    object.height = this.layout.size.y * 2 - padding

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

  getTerrainTexture(height: number): PIXI.Texture {
    if (height < Rules.settings.map_level_water_deep) {
      return this.loader.resources["terrain_water_deep"]!.texture
    } else if (height < Rules.settings.map_level_water_shallow) {
      return this.loader.resources["terrain_water_shallow"]!.texture
    } else if (height < Rules.settings.map_level_sand) {
      return this.loader.resources["terrain_sand"]!.texture
    } else if (height < Rules.settings.map_level_sand_grassy) {
      return this.loader.resources["terrain_sand_grassy"]!.texture
    } else if (height < Rules.settings.map_level_grass_sandy) {
      return this.loader.resources["terrain_grass_sandy"]!.texture
    } else if (height < Rules.settings.map_level_grass) {
      return this.loader.resources["terrain_grass"]!.texture
    } else if (height < Rules.settings.map_level_grass_dirty) {
      return this.loader.resources["terrain_grass_dirty"]!.texture
    } else if (height < Rules.settings.map_level_dirt_grassy) {
      return this.loader.resources["terrain_dirt_grassy"]!.texture
    } else if (height < Rules.settings.map_level_dirt) {
      return this.loader.resources["terrain_dirt"]!.texture
    } else if (height < Rules.settings.map_level_dirt_stony) {
      return this.loader.resources["terrain_dirt_stony"]!.texture
    } else if (height < Rules.settings.map_level_stone_dirty) {
      return this.loader.resources["terrain_stone_dirty"]!.texture
    } else if (height < Rules.settings.map_level_stone) {
      return this.loader.resources["terrain_stone"]!.texture
    } else {
      return this.loader.resources["terrain_ice"]!.texture
    }
  }

  getGroupSprite(group: Group): PIXI.Texture {
    return this.loader.resources["unit_scout_own"].texture
  }

  addListener(listener: RendererListener) {
    this.listeners.push(listener)
  }

  removeListener(listener: RendererListener) {
    const index = this.listeners.indexOf(listener)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }
}
