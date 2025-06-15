import { Viewport } from "pixi-viewport";
import { GlowFilter } from "pixi-filters";

import * as Util from "@shared/util";
import { Layout, equals, hash, neighborsRange, Hex } from "@shared/hex";
import * as Vector2 from "@shared/vector2";
import { ClientTile, ZIndices } from "./types";
import {
  Building,
  Unit,
  Tile,
  Battle,
  UnitBehavior,
  SelectionType,
} from "@shared/objects";
import { convertToSpriteName, Hashtable } from "@shared/util";
import { useStore } from "@/lib/state";
import * as PlayerRelation from "@shared/relation";
import {
  drawBuildingGraphics,
  drawUnitGraphics,
  drawTerrainGraphics,
  BIOME_COLORS,
  drawResourceGenerationIndicator,
} from "./sprites";
import { Socket } from "socket.io-client";
import {
  Application,
  Container,
  FederatedPointerEvent,
  Graphics,
  Point,
  Rectangle,
  Sprite,
  Text,
} from "pixi.js";
import { Resources } from "@shared/resources";

export class Engine {
  private viewport: Viewport;
  private readonly HEX_SIZE: number = 80;
  private layout: Layout = new Layout(
    Layout.pointy,
    Vector2.create(this.HEX_SIZE, this.HEX_SIZE),
    Vector2.create(0, 0)
  );
  private initialFocusSet: boolean = false;
  private readonly GLOW_FILTER: GlowFilter = new GlowFilter({
    distance: 30,
    outerStrength: 2,
    color: 0x000000,
  });
  private uid: string;
  private app: Application;
  private socket: Socket;
  private debugMode: boolean = false;
  private debugContainer: Container | null = null;
  private isDragging: boolean = false;
  private animationFrameIds: Map<string, number> = new Map();
  private selectedSprite: Sprite | null = null;
  constructor(app: Application) {
    this.uid = useStore.getState().userId!;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const viewport = new Viewport({
      screenWidth,
      screenHeight,
      passiveWheel: false,
      disableOnContextMenu: true,
      events: app.renderer.events,
    });
    this.viewport = viewport;
    // activate plugins
    viewport
      .clampZoom({
        maxScale: 2,
        minScale: 0.2,
      })
      .drag()
      .pinch()
      .wheel()
      .decelerate();

    app.stage.addChild(viewport);
    this.app = app;
    this.socket = useStore.getState().socket!;

    this.viewport.sortableChildren = true;

    this.viewport.on("click", () => {
      this.viewport.plugins.remove("follow");
    });

    this.viewport.on("drag-start", () => {
      this.isDragging = true;
    });

    this.viewport.on("drag-end", () => {
      this.isDragging = false;
    });

    window.addEventListener("keyup", this.handleKeyUp, false);
    window.addEventListener("resize", this.resize, false);
    this.socket.on("gamestate tiles", this.handleTilesUpdate);
    this.socket.on("gamestate unit", this.handleUnitUpdate);
    this.socket.on("gamestate units", this.handleUnitsUpdate);
    this.socket.on("gamestate buildings", this.handleBuildingsUpdate);
    this.socket.on("gamestate building", this.handleBuildingUpdate);
    this.socket.on(
      "gamestate resource generation",
      this.handleResourceGeneration
    );
    this.socket.on("gamestate battles", this.handleBattlesUpdate);

    this.requestTiles(this.socket);
    if (import.meta.env.DEV) {
      this.toggleDebugMode();
    }

    if (import.meta.hot) {
      import.meta.hot.dispose(() => {
        this.initialFocusSet = false;
      });
    }
  }

  destroy(): void {
    // Cancel all animations
    this.animationFrameIds.forEach((frameId) => {
      cancelAnimationFrame(frameId);
    });
    this.animationFrameIds.clear();

    // Clear selection state
    this.clearSelection();

    // Remove event listeners
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("resize", this.resize);

    // Remove socket listeners
    this.socket.off("gamestate tiles", this.handleTilesUpdate);
    this.socket.off("gamestate unit", this.handleUnitUpdate);
    this.socket.off("gamestate units", this.handleUnitsUpdate);
    this.socket.off("gamestate buildings", this.handleBuildingsUpdate);
    this.socket.off("gamestate building", this.handleBuildingUpdate);
    this.socket.off(
      "gamestate resource generation",
      this.handleResourceGeneration
    );
    this.socket.off("gamestate battles", this.handleBattlesUpdate);

    // Clean up viewport and its listeners
    if (this.viewport) {
      this.viewport.removeAllListeners();
      this.app.stage.removeChild(this.viewport);
      this.viewport.destroy();
    }
  }

  private resize = () => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    this.viewport.resize(screenWidth, screenHeight);
  };

  private requestTiles = (socket: Socket) => {
    socket.emit("request tiles");
  };

  private handleUnitUpdate = (unit: Unit) => {
    const { world, setWorld } = useStore.getState();
    if (world.units[unit.id]) {
      // Update existing unit
      setWorld({
        ...world,
        units: {
          ...world.units,
          [unit.id]: unit,
        },
      });
    } else {
      // New unit
      setWorld({
        ...world,
        units: {
          ...world.units,
          [unit.id]: unit,
        },
      });
    }
    this.updateScenegraphUnit(unit, this.uid);
    this.updateSelection();
  };

  private handleUnitsUpdate = (units: Hashtable<Unit>) => {
    const { world, setWorld } = useStore.getState();
    const newUnits: Hashtable<Unit> = {};
    const visitedOldUnits: Hashtable<boolean> = {};
    let needsTileUpdate = false;

    // We no longer need to worry about selection state since updateScenegraphUnit handles it
    // Each unit will maintain its own selection state properly

    Object.values(units).forEach((receivedUnit) => {
      const oldUnit = world.units[receivedUnit.id];
      visitedOldUnits[receivedUnit.id] = true;

      if (
        !oldUnit ||
        !equals(oldUnit.pos, receivedUnit.pos) ||
        oldUnit.spotting !== receivedUnit.spotting
      ) {
        this.updateScenegraphUnit(receivedUnit, this.uid);
        needsTileUpdate = true;
      }

      if (
        !oldUnit &&
        receivedUnit.owner !== this.uid &&
        world.playerRelations[
          PlayerRelation.hash(receivedUnit.owner, this.uid)
        ] === undefined
      ) {
        this.socket.emit("request relation", {
          id1: receivedUnit.owner,
          id2: this.uid,
        });
      }

      newUnits[receivedUnit.id] = receivedUnit;
    });

    // Handle units that no longer exist
    Object.keys(world.units).forEach((id) => {
      if (!visitedOldUnits[id]) {
        this.removeItem(parseInt(id));
        needsTileUpdate = true;
      }
    });

    setWorld({
      ...world,
      units: newUnits,
    });

    if (needsTileUpdate) {
      this.requestTiles(this.socket);
    }
  };

  private handleBuildingsUpdate = (buildings: Hashtable<Building>) => {
    const { world, setWorld } = useStore.getState();
    const newBuildings: Hashtable<Building> = {};
    const visitedOldBuildings: Hashtable<boolean> = {};

    Object.values(buildings).forEach((building) => {
      visitedOldBuildings[building.id] = true;
      newBuildings[building.id] = building;

      // Only update scenegraph if it's a new building
      if (!world.buildings[building.id]) {
        this.updateScenegraphBuilding(building);
      }
    });

    // Remove buildings that are no longer present
    Object.keys(world.buildings).forEach((id) => {
      if (!visitedOldBuildings[id]) {
        this.removeItem(parseInt(id));
      }
    });

    setWorld({
      ...world,
      buildings: newBuildings,
    });
  };

  private handleTilesUpdate = (tiles: Util.Hashtable<ClientTile>) => {
    const { world, setWorld } = useStore.getState();
    const visibleHexes: Hashtable<Hex> = {};

    // Determine visible hexes based on units and buildings
    Object.values(world.units).forEach((unit) => {
      neighborsRange(unit.pos, unit.spotting).forEach((hex) => {
        visibleHexes[hash(hex)] = hex;
      });
    });

    // Fixed building.pos to building.position
    Object.values(world.buildings).forEach((building) => {
      neighborsRange(building.position, building.spotting).forEach((hex) => {
        visibleHexes[hash(hex)] = hex;
      });
    });

    // Add new tiles to world
    setWorld({
      ...world,
      tiles: {
        ...world.tiles,
        ...tiles,
      },
    });

    // Update visibility and render tiles
    Object.values(world.tiles).forEach((tile: Tile) => {
      const cTile = tile as ClientTile;
      const oldVisibility = cTile.visible;
      cTile.visible = visibleHexes[hash(tile.hex)] !== undefined;

      if (oldVisibility !== cTile.visible) {
        this.updateScenegraphTile(cTile);
      }
    });
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    switch (event.key) {
      case "+":
        this.zoomIn();
        break;
      case "-":
        this.zoomOut();
        break;
      case "/":
        this.resetZoom();
        break;
      case "r":
      case "R":
        this.centerViewport();
        break;
      case "d":
      case "D":
        this.toggleDebugMode();
        break;
      case "s":
        this.viewport.dirty = true;
        break;
      default:
        break;
    }
  };

  /**
   * Clear any existing selection highlighting
   */
  private clearSelection(): void {
    if (this.selectedSprite) {
      this.selectedSprite.filters = [];
      this.selectedSprite.zIndex -= 1;
      this.selectedSprite = null;
    }
  }

  updateSelection(): void {
    const { selection } = useStore.getState();

    // Clear previous selection
    this.clearSelection();

    if (selection.id === undefined) {
      return;
    }

    let prefix = "";
    switch (selection.type) {
      case SelectionType.Unit:
        prefix = "u";
        break;
      case SelectionType.Building:
        prefix = "b";
        break;
      case SelectionType.Tile:
        prefix = "t";
        break;
    }

    const spriteName = convertToSpriteName(selection.id, prefix);
    const sprite = this.viewport.getChildByName(spriteName) as Sprite;
    if (!sprite) {
      return;
    }

    // Apply glow filter to the original sprite
    sprite.zIndex = sprite.zIndex + 1;
    sprite.filters = [this.GLOW_FILTER];
    this.selectedSprite = sprite;
  }

  removeItem(id: number): void {
    if (!this.viewport) return;

    const { selection } = useStore.getState();

    // Check if this is the currently selected item
    if (selection.id === id) {
      // Clear selection before removing to avoid filter errors
      this.clearSelection();
    }

    const unitSpriteName = convertToSpriteName(id, "u");
    const oldUnitSprite = this.viewport.getChildByName(
      unitSpriteName
    ) as Sprite;
    if (oldUnitSprite) {
      this.stopMovementAnimation(unitSpriteName);
      this.stopWorkingAnimation(unitSpriteName);
      this.viewport.removeChild(oldUnitSprite);
    }

    const buildingName = convertToSpriteName(id, "b");
    const buildingSprite = this.viewport.getChildByName(buildingName) as Sprite;
    if (buildingSprite) {
      this.viewport.removeChild(buildingSprite);
    }

    // Also remove battle indicators if an item being removed had an associated battle
    // const battleIndicatorName = convertToSpriteName(id, "battleindicator");
    // const battleIndicator = this.viewport.getChildByName(battleIndicatorName) as Sprite;
    // if (battleIndicator) {
    //   this.viewport.removeChild(battleIndicator);
    // }
  }

  /**
   * Generate a random position within a hex tile
   * @param hexPos The hex coordinates
   * @param useTopHalf Whether to use the top half (true) or bottom half (false) of the hex
   * @returns A random position as {x, y} coordinates
   */
  private getRandomPositionInHex(
    hexPos: Hex,
    useTopHalf: boolean
  ): Vector2.Vector2 {
    const hexCenter = this.layout.hexToPixel(hexPos);
    const hexHeight = this.HEX_SIZE * 2;
    const hexWidth = this.HEX_SIZE * Math.sqrt(3);

    // Random position horizontally (-0.5 to 0.5 of hex width)
    const randX = hexCenter.x + (Math.random() * hexWidth - hexWidth / 2) * 0.6;

    // For y position:
    // - If useTopHalf is true: use the top half (negative offset from center)
    // - If useTopHalf is false: use the bottom half (positive offset from center)
    const yDirection = useTopHalf ? -1 : 1;
    const randY =
      hexCenter.y + yDirection * ((Math.random() * hexHeight) / 2) * 0.6;

    return Vector2.create(randX, randY);
  }

  /**
   * Find a non-colliding position within a hex
   * @param hexPos The hex position to find a position within
   * @param useTopHalf Whether to use the top half (true) or bottom half (false) of the hex
   * @param label Sprite label prefix to check against for collisions (e.g., 'u_' for units)
   * @param excludeSprite Optional sprite to exclude from collision checks
   * @returns A Vector2 position with no collisions
   */
  private findNonCollidingPositionInHex(
    hexPos: Hex,
    useTopHalf: boolean,
    label: string,
    excludeSprite?: Sprite
  ): Vector2.Vector2 {
    let randomPos = this.getRandomPositionInHex(hexPos, useTopHalf);
    let attempts = 0;
    const maxAttempts = 10;

    // Create a temporary hitArea for collision testing
    const hitRadius = 10;
    const collisionBounds = new Rectangle(
      randomPos.x - hitRadius,
      randomPos.y - hitRadius,
      hitRadius * 2,
      hitRadius * 2
    );

    while (attempts < maxAttempts) {
      let collision = false;

      for (const child of this.viewport.children) {
        if (
          child !== excludeSprite &&
          child.label &&
          child.label.toString().startsWith(label.replace("_", ""))
        ) {
          // Use PixiJS's built-in bounds checking
          const childBounds = child.getBounds(false);
          if (
            childBounds.x < collisionBounds.x + collisionBounds.width &&
            childBounds.x + childBounds.width > collisionBounds.x &&
            childBounds.y < collisionBounds.y + collisionBounds.height &&
            childBounds.y + childBounds.height > collisionBounds.y
          ) {
            collision = true;
            break;
          }
        }
      }

      if (!collision) break;

      // Try another position
      randomPos = this.getRandomPositionInHex(hexPos, useTopHalf);
      // Update collision bounds for the new position
      collisionBounds.x = randomPos.x - hitRadius;
      collisionBounds.y = randomPos.y - hitRadius;
      attempts++;
    }

    return randomPos;
  }

  async updateScenegraphUnit(unit: Unit, uid?: string): Promise<void> {
    const { selection, world } = useStore.getState();

    const spriteName = convertToSpriteName(unit.id, "u");
    const isCurrentlySelected =
      this.selectedSprite &&
      selection.type === SelectionType.Unit &&
      selection.id === unit.id;

    // If this unit is selected, clear selection before removing the sprite
    if (isCurrentlySelected) {
      this.clearSelection();
    }

    // Remove existing sprite to prevent duplicates
    this.removeItem(unit.id);

    // Get relation type for color
    const relationHash = PlayerRelation.hash(unit.owner, this.uid);
    const relation = world.playerRelations[relationHash];
    const relationType = relation?.relationType;

    // Create container and graphics for the new sprite
    const object = new Sprite();
    object.label = spriteName;

    const graphics = new Graphics();
    drawUnitGraphics(graphics, unit.owner, this.uid, relationType);
    object.addChild(graphics);

    object.interactive = true;
    object.cursor = "pointer";
    object.on("pointerup", (event: FederatedPointerEvent) => {
      if (this.isDragging) {
        return;
      }
      if (event.button === 0) {
        console.log(`clicked unit ${unit.id}`);
        const { setSelection } = useStore.getState();
        setSelection({ type: SelectionType.Unit, id: unit.id });
        this.updateSelection();
      } else if (event.button === 2) {
        console.log(`right clicked unit ${unit.id}`);
      } else if (event.button === 1) {
        console.log(`middle clicked unit ${unit.id}`);
        this.viewport.follow(object);
      }
    });
    this.viewport.addChild(object);

    // Find a non-colliding position in the bottom half of the hex
    const randomPos = this.findNonCollidingPositionInHex(
      unit.pos,
      false,
      "u",
      object
    );

    // Update the sprite position
    object.x = randomPos.x;
    object.y = randomPos.y;
    object.zIndex = ZIndices.Units;

    // Handle animation for moving units or working units
    const isMoving = unit.targetHexes && unit.targetHexes.length > 0;
    // A unit is working if it's assigned and not currently moving to a new hex
    const isWorking = unit.assignedToBuilding !== undefined && !isMoving;

    if (isMoving) {
      this.stopWorkingAnimation(spriteName, object); // Stop working if it starts moving
      this.startMovementAnimation(spriteName, object);
    } else if (isWorking) {
      this.stopMovementAnimation(spriteName, object); // Stop moving if it starts working
      this.startWorkingAnimation(spriteName, object);
    } else {
      // Neither moving nor working: stop both animations
      this.stopMovementAnimation(spriteName, object);
      this.stopWorkingAnimation(spriteName, object);
    }

    // Restore selection state if this was the selected unit
    if (isCurrentlySelected) {
      // Apply glow filter to the object
      object.filters = [this.GLOW_FILTER];
      this.selectedSprite = object;
    }

    // Update movement indicator
    const oldSprite = this.viewport.getChildByName(
      "MovementIndicator"
    ) as Container;
    if (oldSprite) {
      this.viewport.removeChild(oldSprite);
    }

    if (uid && unit.owner === uid) {
      const movementIndicatorContainer = new Container();
      movementIndicatorContainer.label = "MovementIndicator";
      movementIndicatorContainer.zIndex = ZIndices.Units;

      this.viewport.addChild(movementIndicatorContainer);

      for (const hex of unit.targetHexes) {
        const indicator = new Graphics();
        indicator.beginFill(0x0000ff);
        indicator.drawCircle(5, 5, 5);
        indicator.endFill();

        const hexPoint = this.layout.hexToPixel(hex);
        indicator.x = hexPoint.x - 5;
        indicator.y = hexPoint.y - 5;
        indicator.alpha = 0.7;

        movementIndicatorContainer.addChild(indicator);
      }
    }
  }

  /**
   * Start the wobble animation for a moving unit
   * @param spriteName The unique name of the sprite
   * @param sprite The sprite to animate
   */
  private startMovementAnimation(spriteName: string, sprite: Sprite): void {
    // Cancel any existing animation
    this.stopMovementAnimation(spriteName);

    // Initialize animation parameters
    let time = 0;
    const animationSpeed = 0.05;
    const bobHeight = 2; // Maximum vertical movement
    const rotationAmount = 0.1; // Maximum rotation in radians (increased)

    // Store sprite's original position
    const originalY = sprite.y;

    // Animation function
    const animate = () => {
      time += animationSpeed;

      // Vertical bobbing motion
      sprite.y = originalY + Math.sin(time) * bobHeight;

      // Slight rotation - make it more noticeable
      sprite.angle = Math.sin(time * 1.5) * ((rotationAmount * 180) / Math.PI);

      // Request next frame
      const frameId = requestAnimationFrame(animate);
      this.animationFrameIds.set(spriteName, frameId);
    };

    // Start the animation
    animate();
  }

  /**
   * Stop the wobble animation for a unit
   * @param spriteName The unique name of the sprite
   * @param sprite Optional sprite to reset position and rotation
   */
  private stopMovementAnimation(spriteName: string, sprite?: Sprite): void {
    // Cancel the animation if it exists
    const frameId = this.animationFrameIds.get(spriteName);
    if (frameId) {
      cancelAnimationFrame(frameId);
      this.animationFrameIds.delete(spriteName);
    }

    // Reset sprite position and rotation if provided
    if (sprite) {
      sprite.angle = 0;
    }
  }

  /**
   * Start the pulsing animation for a working unit
   * @param spriteName The unique name of the sprite
   * @param sprite The sprite to animate
   */
  private startWorkingAnimation(spriteName: string, sprite: Sprite): void {
    // Cancel any existing animation for this sprite name
    this.stopWorkingAnimation(spriteName);

    // Initialize animation parameters
    let time = 0;
    const animationSpeed = 0.02; // Slower speed for working
    const scaleVariation = 0.05; // Gentle 5% pulse

    // Store sprite's original scale (assuming it's 1,1)
    const originalScaleX = sprite.scale.x;
    const originalScaleY = sprite.scale.y;

    // Animation function
    const animate = () => {
      time += animationSpeed;

      // Pulsing scale effect
      const scaleFactor = 1 + Math.sin(time) * scaleVariation;
      sprite.scale.set(
        originalScaleX * scaleFactor,
        originalScaleY * scaleFactor
      );

      // Request next frame
      const frameId = requestAnimationFrame(animate);
      this.animationFrameIds.set(spriteName, frameId);
    };

    // Start the animation
    animate();
  }

  /**
   * Stop the pulsing animation for a working unit
   * @param spriteName The unique name of the sprite
   * @param sprite Optional sprite to reset scale
   */
  private stopWorkingAnimation(spriteName: string, sprite?: Sprite): void {
    // Cancel the animation if it exists
    const frameId = this.animationFrameIds.get(spriteName);
    if (frameId) {
      cancelAnimationFrame(frameId);
      this.animationFrameIds.delete(spriteName);
    }

    // Reset sprite scale if provided
    if (sprite) {
      // Assuming default scale is 1. If sprites can have other base scales,
      // this might need adjustment or storing original scale more robustly.
      sprite.scale.set(1);
    }
  }

  async updateScenegraphBuilding(building: Building): Promise<void> {
    if (!this.initialFocusSet) {
      this.initialFocusSet = true;
      this.centerOn(building.position);
    }

    const { selection, world } = useStore.getState();
    const spriteName = convertToSpriteName(building.id, "b");
    const isCurrentlySelected =
      this.selectedSprite &&
      selection.type === SelectionType.Building &&
      selection.id === building.id;

    // Clear selection temporarily if this building is selected
    if (isCurrentlySelected) {
      this.clearSelection();
    }

    let object = this.viewport.getChildByName(spriteName) as Sprite;

    // If object already exists, we only need to update its position if it moved
    // Otherwise we need to create a new sprite
    const isNewSprite = !object;

    if (isNewSprite) {
      // Create new container for building
      object = new Sprite();
      object.label = spriteName;

      // Create graphics for building shape
      const graphics = new Graphics();
      const relationHash = PlayerRelation.hash(building.owner, this.uid);
      const relation = world.playerRelations[relationHash];
      const relationType = relation?.relationType;
      drawBuildingGraphics(graphics, building, this.uid, relationType);
      object.addChild(graphics);

      object.interactive = true;
      object.cursor = "pointer";
      object.on("pointerup", (event: FederatedPointerEvent) => {
        if (this.isDragging) {
          return;
        }
        const { selection, setSelection, world } = useStore.getState();
        if (event.button === 0) {
          console.log(`clicked building ${building.id}`);
          setSelection({ type: SelectionType.Building, id: building.id });
          this.updateSelection();
        } else if (event.button === 2) {
          // Handle right-click for unit assignment
          if (
            selection.type === SelectionType.Unit &&
            selection.id !== undefined
          ) {
            const selectedUnit = world.units[selection.id];
            const targetBuilding = world.buildings[building.id];

            if (selectedUnit && targetBuilding) {
              // Find the first available slot
              let freeSlotIndex = -1;
              if (targetBuilding.slots && targetBuilding.slots.length > 0) {
                for (let i = 0; i < targetBuilding.slots.length; i++) {
                  if (
                    targetBuilding.slots[i].assignedUnitId === undefined ||
                    targetBuilding.slots[i].assignedUnitId === null
                  ) {
                    freeSlotIndex = i;
                    break;
                  }
                }
              }

              if (freeSlotIndex !== -1) {
                console.log(
                  `Right-clicked building ${building.id} with unit ${selection.id} selected. Assigning to slot ${freeSlotIndex}.`
                );
                this.requestUnitAssignment(
                  selection.id,
                  building.id,
                  freeSlotIndex
                );
              } else {
                console.warn(
                  `Building ${building.id} has no free slots for unit ${selection.id}.`
                );
              }
            }
          }
        }
      });

      // Find a non-colliding position in the top half of the hex
      const randomPos = this.findNonCollidingPositionInHex(
        building.position,
        true,
        "b",
        object
      );
      object.x = randomPos.x;
      object.y = randomPos.y;

      this.viewport.addChild(object);
    } else {
      // For existing sprites, update the graphics
      const graphics = object.getChildAt(0) as Graphics;
      const relationHash = PlayerRelation.hash(building.owner, this.uid);
      const relation = world.playerRelations[relationHash];
      const relationType = relation?.relationType;
      drawBuildingGraphics(graphics, building, this.uid, relationType);

      // Update position if needed based on the hex center
      const oldHexCenter = this.layout.hexToPixel(building.position);
      const newHexCenter = this.layout.hexToPixel(building.position);
      if (
        oldHexCenter.x !== newHexCenter.x ||
        oldHexCenter.y !== newHexCenter.y
      ) {
        object.x = newHexCenter.x;
        object.y = newHexCenter.y;
      }
    }

    object.zIndex = ZIndices.Buildings;

    // Restore selection if this was the selected building
    if (isCurrentlySelected) {
      object.filters = [this.GLOW_FILTER];
      this.selectedSprite = object;
    }
  }

  /**
   * Request a unit to be assigned to a building slot
   * @param unitId The ID of the unit to assign
   * @param buildingId The ID of the building to assign to
   * @param slotIndex The index of the slot in the building
   */
  requestUnitAssignment(
    unitId: number,
    buildingId: number,
    slotIndex: number
  ): void {
    const { world } = useStore.getState();
    const unit = world.units[unitId];
    const building = world.buildings[buildingId];

    if (!unit || !building) {
      console.warn(`Cannot assign: unit or building not found`);
      return;
    }

    if (unit.owner !== this.uid) {
      console.warn(`Cannot assign unit ${unitId}: not owned by ${this.uid}`);
      return;
    }

    if (building.owner !== this.uid) {
      console.warn(
        `Cannot assign to building ${buildingId}: not owned by ${this.uid}`
      );
      return;
    }

    // Send assignment request to server
    this.socket.emit("request assign unit", {
      unitId: unitId,
      buildingId: buildingId,
      slotIndex: slotIndex,
    });
  }

  /**
   * Request a unit to be unassigned from its current building
   * @param unitId The ID of the unit to unassign
   */
  requestUnitUnassignment(unitId: number): void {
    const { world } = useStore.getState();
    const unit = world.units[unitId];

    if (!unit) {
      console.warn(`Cannot unassign: unit not found`);
      return;
    }

    if (unit.owner !== this.uid) {
      console.warn(`Cannot unassign unit ${unitId}: not owned by ${this.uid}`);
      return;
    }

    if (unit.assignedToBuilding === undefined) {
      console.warn(`Unit ${unitId} is not assigned to any building`);
      return;
    }

    // Send unassignment request to server
    this.socket.emit("request unassign unit", {
      unitId: unitId,
    });
  }

  /**
   * Request a building to be upgraded
   * @param buildingId The ID of the building to upgrade
   */
  requestBuildingUpgrade(buildingId: number): void {
    const { world } = useStore.getState();
    const building = world.buildings[buildingId];

    if (!building) {
      console.warn(`Cannot upgrade: building not found`);
      return;
    }

    if (building.owner !== this.uid) {
      console.warn(
        `Cannot upgrade building ${buildingId}: not owned by ${this.uid}`
      );
      return;
    }

    // Send upgrade request to server
    this.socket.emit("request upgrade building", {
      buildingId: buildingId,
    });
  }

  /**
   * Request to hire a new unit at a building
   * @param buildingId The ID of the building where the unit will be hired
   * @param unitType The type of unit to hire
   */
  requestHireUnit(buildingId: number, unitType: string): void {
    const { world } = useStore.getState();
    const building = world.buildings[buildingId];

    if (!building) {
      console.warn(`Cannot hire unit: building not found`);
      return;
    }

    if (building.owner !== this.uid) {
      console.warn(
        `Cannot hire unit at building ${buildingId}: not owned by ${this.uid}`
      );
      return;
    }

    // Send hire request to server
    this.socket.emit("request hire unit", {
      buildingId: buildingId,
      unitType: unitType,
    });
  }

  async updateScenegraphTile(tile: ClientTile): Promise<void> {
    const { setSelection } = useStore.getState();
    const spriteName = convertToSpriteName(tile.id, "t");
    let object = this.viewport.getChildByName(spriteName) as Sprite;
    if (!object) {
      // Create new container for tile
      object = new Sprite();
      object.label = spriteName;

      // Create graphics for tile
      const graphics = new Graphics();
      drawTerrainGraphics(graphics, tile);
      object.addChild(graphics);

      this.viewport.addChild(object);
      object.interactive = true;
      object.on("pointerup", (event: FederatedPointerEvent) => {
        const { selection } = useStore.getState();
        if (this.isDragging) {
          return;
        }
        if (event.button === 0) {
          console.log(`clicked tile ${tile.id}`);
          setSelection({ type: SelectionType.Tile, id: tile.id });
          this.updateSelection();
        } else if (event.button === 2) {
          console.log(`right clicked tile ${tile.id}`);
          if (
            selection.type === SelectionType.Unit &&
            selection.id !== undefined
          ) {
            this.requestUnitMovement(selection.id, tile.hex);
          }
        } else if (event.button === 1) {
          console.log(`middle clicked tile ${tile.id}`);
        }
      });
    } else {
      // Update existing tile graphics
      const graphics = object.getChildAt(0) as Graphics;
      drawTerrainGraphics(graphics, tile);
    }

    const hexCenter = this.layout.hexToPixel(tile.hex);
    object.anchor.set(0.5, 0.5);
    object.x = hexCenter.x;
    object.y = hexCenter.y;

    // Draw hex boundary directly on the graphics object
    const hexGraphics = object.getChildAt(0) as Graphics;
    if (hexGraphics) {
      // Get hex corners
      const corners = this.layout.polygonCorners(tile.hex);

      // Add padding by scaling down the corners from the center
      const paddingScale = 0.98; // Reduced padding (was 0.95)
      const scaledCorners = corners.map((corner) => ({
        x: hexCenter.x + (corner.x - hexCenter.x) * paddingScale,
        y: hexCenter.y + (corner.y - hexCenter.y) * paddingScale,
      }));

      // Convert corners to array of points for drawPolygon
      const points: number[] = [];
      for (const corner of scaledCorners) {
        points.push(corner.x - hexCenter.x);
        points.push(corner.y - hexCenter.y);
      }

      // Redraw with correct color - get from our biome colors map
      const biomeColor = BIOME_COLORS[tile.biome];
      hexGraphics.clear();
      hexGraphics.beginFill(biomeColor);
      hexGraphics.drawPolygon(points);
      hexGraphics.endFill();
    }

    object.zIndex = ZIndices.Tiles;
    object.visible = true;
    object.alpha = tile.visible ? 1 : 0.5;
  }

  zoomIn(): void {
    if (!this.viewport) return;
    this.viewport.zoom(-200, true);
  }

  zoomOut(): void {
    if (!this.viewport) return;
    this.viewport.zoom(200, true);
  }

  resetZoom(): void {
    if (!this.viewport) return;
    this.viewport.setZoom(1);
  }

  centerViewport(x = 0, y = 0): void {
    if (!this.viewport) return;
    this.viewport.center = new Point(x, y);
  }

  centerOn(pos: Hex): void {
    if (!this.viewport) return;
    const point = this.layout.hexToPixel(pos);
    this.viewport.animate({
      time: 400,
      position: {
        x: point.x,
        y: point.y,
      },
    });
  }

  toggleDebugMode(): void {
    this.debugMode = !this.debugMode;
    console.log(`Debug mode: ${this.debugMode ? "ON" : "OFF"}`);

    if (this.debugMode) {
      this.renderDebugHexGrid();
    } else {
      this.clearDebugVisuals();
    }
  }

  clearDebugVisuals(): void {
    if (!this.viewport) return;

    if (this.debugContainer) {
      this.viewport.removeChild(this.debugContainer);
      this.debugContainer.destroy();
      this.debugContainer = null;
    }

    // Remove all coordinate text elements
    this.viewport.children.forEach((child) => {
      if (child.label === "debug_coord") {
        this.viewport!.removeChild(child);
      }
    });
  }

  renderDebugHexGrid(): void {
    if (!this.viewport) return;

    // Clear previous debug visuals first
    this.clearDebugVisuals();

    this.debugContainer = new Container();
    this.debugContainer.zIndex = ZIndices.Debug;
    this.viewport.addChild(this.debugContainer);

    // Render visible hex boundaries
    const { world } = useStore.getState();
    Object.values(world.tiles).forEach((tile: Tile) => {
      const cTile = tile as ClientTile;
      const corners = this.layout.polygonCorners(cTile.hex);
      const center = this.layout.hexToPixel(cTile.hex);

      const outline = new Graphics();

      // Draw the hexagon using the new API
      outline.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) {
        outline.lineTo(corners[i].x, corners[i].y);
      }
      outline.lineTo(corners[0].x, corners[0].y);
      outline.stroke({ color: 0x000000, width: 1, pixelLine: true });

      this.debugContainer?.addChild(outline);

      const coordText = new Text(`${cTile.hex.q},${cTile.hex.r}`, {
        fontSize: 8,
        fill: 0x000000,
      });
      coordText.position.set(center.x - 10, center.y - 5);
      coordText.zIndex = ZIndices.Debug;
      coordText.label = "debug_coord";
      this.debugContainer?.addChild(coordText);
    });
  }

  /**
   * Request a unit to move to a target hex and start animation immediately
   * @param unitId The ID of the unit to move
   * @param targetHex The destination hex
   */
  private requestUnitMovement(unitId: number, targetHex: Hex): void {
    const { world } = useStore.getState();
    const unit = world.units[unitId];

    if (!unit) {
      console.warn(`Cannot move unit ${unitId}: not found`);
      return;
    }

    if (unit.owner !== this.uid) {
      console.warn(`Cannot move unit ${unitId}: not owned by ${this.uid}`);
      return;
    }

    // Send movement request to server
    this.socket.emit("request movement", {
      selection: unitId,
      target: targetHex,
    });

    // Set movement status to 1 so that in case the server cancels the movement,
    // the animation is stopped because the movement status is reset to 0 and the unit will be updated in the scenegraph.
    unit.movementStatus = 1;

    // Start animation immediately without waiting for server response
    const spriteName = convertToSpriteName(unitId, "u");
    const sprite = this.viewport.getChildByName(spriteName) as Sprite;

    if (sprite) {
      this.startMovementAnimation(spriteName, sprite);
    }
  }

  private handleBuildingUpdate = (building: Building) => {
    const { world, setWorld } = useStore.getState();

    // Update the building in the world state
    setWorld({
      ...world,
      buildings: {
        ...world.buildings,
        [building.id]: building,
      },
    });

    // Update the building in the scene graph
    this.updateScenegraphBuilding(building);

    // Update selection if this building is selected
    this.updateSelection();
  };

  /**
   * Updates the scene with resource generation particles
   * @param building The building generating resources
   * @param resourceType Type of resource being generated
   * @param amount Amount being generated
   */
  showResourceGenerationEffect(
    building: Building,
    resourceType: string,
    amount: number
  ): void {
    const spriteName = convertToSpriteName(building.id, "b");
    const buildingSprite = this.viewport.getChildByName(spriteName) as Sprite;

    let originX: number;
    let originY: number;

    if (buildingSprite) {
      originX = buildingSprite.x;
      originY = buildingSprite.y;
    } else {
      // Fallback if sprite not found
      console.warn(
        `Building sprite ${spriteName} not found for resource effect. Falling back to hex center.`
      );
      const hexCenter = this.layout.hexToPixel(building.position);
      originX = hexCenter.x;
      originY = hexCenter.y;
    }

    // Create container for the effect if it doesn't exist
    const effectName = `resource_effect_${building.id}`;
    let effectContainer = this.viewport.getChildByName(effectName) as Container;

    if (!effectContainer) {
      effectContainer = new Container();
      effectContainer.name = effectName;
      effectContainer.zIndex = ZIndices.Effects;
      this.viewport.addChild(effectContainer);
    }

    // Create a particle
    const particle = new Graphics();
    drawResourceGenerationIndicator(particle, resourceType, amount, 0);

    // Position particle at the building's sprite center
    particle.x = originX;
    particle.y = originY;

    effectContainer.addChild(particle);

    // Animate the particle floating upward
    const animationName = `resource_particle_${Date.now()}_${Math.random()}`;
    let progress = 0;

    const animate = () => {
      progress += 0.01;

      // Move upward and slightly to the side
      particle.y -= 0.5;
      particle.x += Math.sin(progress * 5) * 0.3;

      // Update the particle appearance
      drawResourceGenerationIndicator(particle, resourceType, amount, progress);

      // Remove when animation completes
      if (progress >= 1) {
        effectContainer.removeChild(particle);
        particle.destroy();
        return;
      }

      // Request next frame
      const frameId = requestAnimationFrame(animate);
      this.animationFrameIds.set(animationName, frameId);
    };

    // Start the animation
    animate();
  }

  /**
   * Handle resource generation events from the server
   */
  private handleResourceGeneration = (data: {
    buildingId: number;
    resourceType: string;
    amount: number;
  }) => {
    const { world } = useStore.getState();
    const building = world.buildings[data.buildingId];
    const tile = world.tiles[hash(building.position)] as ClientTile;

    if (tile) {
      // Ensure the resource type exists on the tile, initializing if necessary
      // Cast to keyof Resources to ensure type safety
      if (!tile.resources[data.resourceType as keyof Resources]) {
        tile.resources[data.resourceType as keyof Resources] = 0;
      }
      // Add the generated amount to the tile's resources
      // Cast to keyof Resources to ensure type safety
      tile.resources[data.resourceType as keyof Resources]! += data.amount;

      // Trigger visual effect if the tile is visible
      this.showResourceGenerationEffect(
        building,
        data.resourceType,
        data.amount
      );
    }
  };

  private handleBattlesUpdate = (battles: Hashtable<Battle>) => {
    const { world, setWorld } = useStore.getState();
    const newBattles: Hashtable<Battle> = {};
    const activeBattleIds: Set<number> = new Set();

    Object.values(battles).forEach((battle) => {
      newBattles[battle.id] = battle;
      activeBattleIds.add(battle.id);
      this.updateScenegraphBattleIndicator(battle);
    });

    // Remove indicators for battles that are no longer active
    Object.values(world.battles).forEach((oldBattle) => {
      if (!activeBattleIds.has(oldBattle.id)) {
        this.removeBattleIndicator(oldBattle.id);
      }
    });

    setWorld({
      ...world,
      battles: Object.values(newBattles),
    });
  };

  private updateScenegraphBattleIndicator = (battle: Battle) => {
    const spriteName = convertToSpriteName(battle.id, "battleindicator");
    let indicator = this.viewport.getChildByName(spriteName) as Sprite;

    if (!indicator) {
      indicator = new Sprite();
      indicator.label = spriteName;

      const graphics = new Graphics();
      graphics.beginFill(0xff0000, 0.7);
      graphics.drawCircle(0, 0, 20);
      graphics.endFill();
      indicator.addChild(graphics);

      indicator.interactive = true;
      indicator.cursor = "pointer";
      indicator.on("pointerup", (event: FederatedPointerEvent) => {
        if (this.isDragging) return;
        if (event.button === 0) {
          console.log(`Clicked battle indicator ${battle.id}`);
          const { setSelection } = useStore.getState();
          setSelection({ type: SelectionType.Battle, id: battle.id });
        }
      });
      this.viewport.addChild(indicator); // Add to viewport AFTER setup
    }

    const battlePosition = this.layout.hexToPixel(battle.position);
    indicator.x = battlePosition.x;
    indicator.y = battlePosition.y;
    indicator.zIndex = ZIndices.Effects;

    this.viewport.sortChildren();
  };

  private removeBattleIndicator = (battleId: number) => {
    const spriteName = convertToSpriteName(battleId, "battleindicator");
    const indicator = this.viewport.getChildByName(spriteName) as Sprite;
    if (indicator) {
      this.viewport.removeChild(indicator);
      indicator.destroy();
    }
  };

  requestSetUnitBehavior(unitId: number, behavior: UnitBehavior): void {
    const { world } = useStore.getState();
    const unit = world.units[unitId];

    if (!unit) {
      console.warn(`Cannot set behavior for unit ${unitId}: not found`);
      return;
    }
    if (unit.owner !== this.uid) {
      console.warn(
        `Cannot set behavior for unit ${unitId}: not owned by ${this.uid}`
      );
      return;
    }

    this.socket.emit("request set unit behavior", { unitId, behavior });
  }

  /**
   * Request to change relation with another player
   */
  requestChangeRelation(
    targetPlayerId: string,
    relationType: PlayerRelation.EnumRelationType
  ): void {
    if (!this.socket) return;
    this.socket.emit("request change relation", {
      targetPlayerId,
      relationType,
    });
  }
}
