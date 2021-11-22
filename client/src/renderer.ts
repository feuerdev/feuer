import { Viewport } from "pixi-viewport"
import Hex, { Layout } from "../../shared/hex"
import Selection from "./selection"
import * as Rules from "../../shared/rules.json"
import { GlowFilter } from "pixi-filters"
import * as PIXI from "pixi.js"
import Vector2 from "../../shared/vector2"

export interface RendererListener {
  onRendererLoaded(): void
}

export default class Renderer {
  private readonly listeners: RendererListener[] = []

  private loader: PIXI.Loader
  private p_renderer: PIXI.Renderer
  public viewport?: Viewport
  public layout: Layout
  public selection?: Selection

  static GLOWFILTER = new GlowFilter({ distance: 15, outerStrength: 2 })

  private canvas_map = <HTMLCanvasElement>document.querySelector("#canvas-map")

  constructor() {
    this.layout = new Layout(
      Layout.pointy,
      new Vector2(Rules.settings.map_hex_width, Rules.settings.map_hex_height),
      new Vector2(0, 0)
    )
    this.p_renderer = new PIXI.Renderer({
      view: this.canvas_map,
      width: window.innerWidth,
      height: window.innerHeight,
      resolution: window.devicePixelRatio,
      autoDensity: true,
    })

    window.addEventListener("resize", () => {
      this.p_renderer.resize(window.innerWidth, window.innerHeight)
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
      worldWidth:
        (Rules.settings.map_size * 2 + 1) * Rules.settings.map_hex_width,
      worldHeight:
        (Rules.settings.map_size * 2 + 1) * Rules.settings.map_hex_height,
      interaction: this.p_renderer.plugins.interaction, // the interaction module is important for wheel() to work properly when renderer.view is placed or scaled
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

    PIXI.Ticker.shared.add(() => {
      if (this.viewport?.dirty) {
        this.p_renderer.render(this.viewport)
        this.viewport.dirty = false
      }
    })

    this.listeners.forEach((l) => l.onRendererLoaded())
  }

  updateScenegraph(tile) {
    let hex: Hex = new Hex(tile.hex.q, tile.hex.r, tile.hex.s)

    let corners = this.layout.polygonCorners(hex)
    let padding = 10

    let container = new PIXI.Container()
    container.name = hex.hash()

    let tint = tile.visible ? 0xdddddd : 0x555555
    if (
      this.selection.selectedHex &&
      Hex.equals(this.selection?.selectedHex, tile.hex)
    ) {
      tile.visible ? (tint = 0xffffff) : (tint += 0x333333)
    }

    let texture = this.getTerrainTexture(tile.height)
    let img = new PIXI.Sprite(texture)
    img.tint = tint
    img.x = corners[3]!.x + padding //obere linke ecke
    img.y = corners[3]!.y - this.layout.size.y / 2 + padding //obere linke ecke- halbe höhe
    img.width = this.layout.size.x * Math.sqrt(3) - padding
    img.height = this.layout.size.y * 2 - padding

    container.addChild(img)

    for (let i = 0; i < tile.environmentSpots.length; i++) {
      let spot = tile.environmentSpots[i]
      let texture = spot.texture
      let img = new PIXI.Sprite(this.loader.resources[texture]!.texture)
      let pos = spot.pos
      img.x = this.layout.hexToPixel(hex).x + pos.x
      img.y = this.layout.hexToPixel(hex).y + pos.y
      img.tint = tint
      img.name = spot.id
      if (
        this.selection?.isBuilding() &&
        this.selection.selectedBuilding === spot.id
      ) {
        img.filters = [Renderer.GLOWFILTER]
      }
      if (this.selection?.selectedGroup === spot.id) {
        img.filters = [Renderer.GLOWFILTER]
      }
      container.addChild(img)
    }

    let old = this.viewport?.getChildByName(hex.hash())
    if (old) {
      this.viewport?.removeChild(old)
    }
    this.viewport?.addChild(container)
    this.viewport!.dirty = true
  }

  center(pos: any) {
    let x = this.layout.hexToPixel(pos).x
    let y = this.layout.hexToPixel(pos).y
    this.viewport!.center = new PIXI.Point(x, y)
  }

  getTerrainTexture(height: number) {
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
    } else if (height <= Rules.settings.map_level_ice) {
      return this.loader.resources["terrain_ice"]!.texture
    } else return this.loader.resources["terrain_stone"]!.texture
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

declare const currentUid: string
