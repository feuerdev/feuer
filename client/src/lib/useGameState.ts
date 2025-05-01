import { useState, useCallback, useEffect } from "react";
import { RenderEngine } from "./RenderEngine";
import { useSocket } from "@/lib/SocketProvider";
import { ClientTile, Selection, SelectionType } from "./types";
import { create, Vector2 } from "@shared/vector2";
import { Building, Group, Tile, World } from "@shared/objects";
import * as Util from "@shared/util";
import * as PlayerRelation from "@shared/relation";
import { Hashtable } from "@shared/util";
import { Hex, equals, hash, neighborsRange, round } from "@shared/hex";

export function useGameState() {
  const [engine, setEngine] = useState<RenderEngine | null>(null);
  const [selection, setSelection] = useState<Selection>({
    type: SelectionType.None,
  });
  const [world, setWorld] = useState<World>({
    tiles: {},
    groups: {},
    buildings: {},
    battles: [],
    playerRelations: {},
    idCounter: 0,
    players: {},
    units: [],
  });
  const [uid, setUid] = useState<string>("");
  const { socket } = useSocket();

  // Register the renderer engine
  const registerRenderer = useCallback((rendererEngine: RenderEngine) => {
    setEngine(rendererEngine);
  }, []);

  // Load assets (textures) when engine is set
  useEffect(() => {
    if (!engine) return;

    const loadAssets = async () => {
      await engine.loadAssets();
    };

    loadAssets();
  }, [engine]);

  // Set up keyboard event listeners
  useEffect(() => {
    if (!engine) return;

    const keyUpHandler = (event: KeyboardEvent) => {
      switch (event.key) {
        case "=":
        case "+":
          engine.zoomIn();
          break;
        case "-":
          engine.zoomOut();
          break;
        case "/":
          engine.resetZoom();
          break;
        case "r":
        case "R":
          engine.centerViewport();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keyup", keyUpHandler, false);

    return () => {
      window.removeEventListener("keyup", keyUpHandler, false);
    };
  }, [engine]);

  // Handle viewport clicks
  useEffect(() => {
    if (!engine || !socket) return;

    const handleViewportClick = (
      point: { x: number; y: number },
      button: number
    ) => {
      const vec2Point = create(point.x, point.y);
      switch (button) {
        case 0: // Left
          trySelect(vec2Point);
          break;
        case 2: {
          // Right - Added braces for lexical declaration
          const clickedHex = round(engine.layout.pixelToHex(vec2Point));
          if (clickedHex && selection.type === SelectionType.Group) {
            socket.emit("request movement", {
              selection: selection.id,
              target: clickedHex,
            });
          }
          break;
        }
      }
    };

    // Try to select an entity at the given point
    const trySelect = (point: Vector2) => {
      if (!engine) return;

      const sprites = engine.findSpritesAtPoint(point);
      if (sprites.length === 0) {
        // Clicked on empty space, clear selection
        setSelection({ type: SelectionType.None });
        return;
      }

      // Find the sprite with highest z-index (topmost)
      let highestZ = -1;
      let topSprite = sprites[0];
      sprites.forEach((sprite) => {
        if (sprite.zIndex > highestZ) {
          highestZ = sprite.zIndex;
          topSprite = sprite;
        }
      });

      // Extract entity type and ID from sprite name
      const name = topSprite.name;
      if (!name) return;

      const parts = name.split("_");
      if (parts.length !== 2) return;

      const prefix = parts[0];
      const id = parseInt(parts[1]);

      // Create selection based on entity type - changed let to const
      const newSelection: Selection = { id, type: SelectionType.None };
      switch (prefix) {
        case "g":
          newSelection.type = SelectionType.Group;
          break;
        case "b":
          newSelection.type = SelectionType.Building;
          break;
        case "t":
          newSelection.type = SelectionType.Tile;
          break;
      }

      // Update selection
      setSelection(newSelection);
    };

    // Set up click handler
    engine.registerClickHandler(handleViewportClick);
  }, [engine, selection, socket]);

  // Update selection in the engine when selection state changes
  useEffect(() => {
    if (engine && selection.id !== undefined) {
      engine.updateSelection(selection);
    }
  }, [selection, engine]);

  // Handle socket events
  useEffect(() => {
    if (!socket || !engine) return;

    // Helper function to request tiles
    const requestTiles = () => {
      socket.emit("request tiles");
    };

    const handleGroupUpdate = (group: Group) => {
      if (world.groups[group.id]) {
        // Update existing group
        setWorld((prevWorld) => ({
          ...prevWorld,
          groups: {
            ...prevWorld.groups,
            [group.id]: group,
          },
        }));
      } else {
        // New group
        setWorld((prevWorld) => ({
          ...prevWorld,
          groups: {
            ...prevWorld.groups,
            [group.id]: group,
          },
        }));
      }
      engine.updateScenegraphGroup(group, uid);
    };

    const handleGroupsUpdate = (groups: Hashtable<Group>) => {
      const newGroups: Hashtable<Group> = {};
      const visitedOldGroups: Hashtable<boolean> = {};
      let needsTileUpdate = false;

      // Process received groups
      Object.values(groups).forEach((receivedGroup) => {
        const oldGroup = world.groups[receivedGroup.id];
        visitedOldGroups[receivedGroup.id] = true;

        // Check if group is new, has moved or upgraded
        if (
          !oldGroup ||
          !equals(oldGroup.pos, receivedGroup.pos) ||
          oldGroup.spotting !== receivedGroup.spotting
        ) {
          engine.updateScenegraphGroup(receivedGroup, uid);
          needsTileUpdate = true;
        }

        // If group is new and foreign, request relation
        if (
          !oldGroup &&
          receivedGroup.owner !== uid &&
          world.playerRelations[
            PlayerRelation.hash(receivedGroup.owner, uid)
          ] === undefined
        ) {
          socket.emit("request relation", {
            id1: receivedGroup.owner,
            id2: uid,
          });
        }

        newGroups[receivedGroup.id] = receivedGroup;
      });

      // Remove groups that are not in the new list
      Object.entries(world.groups).forEach(([id, oldGroup]) => {
        if (!visitedOldGroups[id]) {
          engine.removeItem(oldGroup.id);
          needsTileUpdate = true;
        }
      });

      // Update world state
      setWorld((prevWorld) => ({
        ...prevWorld,
        groups: newGroups,
      }));

      if (needsTileUpdate) {
        requestTiles();
      }
    };

    const handleBuildingUpdate = (building: Building) => {
      setWorld((prevWorld) => ({
        ...prevWorld,
        buildings: {
          ...prevWorld.buildings,
          [building.id]: building,
        },
      }));
      engine.updateScenegraphBuilding(building);
    };

    const handleTilesUpdate = (tiles: Util.Hashtable<ClientTile>) => {
      const visibleHexes: Hashtable<Hex> = {};

      // Determine visible hexes based on groups and buildings
      Object.values(world.groups).forEach((group) => {
        neighborsRange(group.pos, group.spotting).forEach((hex) => {
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
      setWorld((prevWorld) => {
        const updatedTiles = { ...prevWorld.tiles };

        Object.entries(tiles).forEach(([id, tile]) => {
          updatedTiles[id] = tile;
        });

        return {
          ...prevWorld,
          tiles: updatedTiles,
        };
      });

      // Update visibility and render tiles
      Object.values(world.tiles).forEach((tile: Tile) => {
        const cTile = tile as ClientTile;
        const oldVisibility = cTile.visible;
        cTile.visible = visibleHexes[hash(tile.hex)] !== undefined;

        if (oldVisibility !== cTile.visible) {
          engine.updateScenegraphTile(cTile);
        }
      });
    };

    // Set up socket listeners
    socket.on("your id", (id) => {
      setUid(id);
    });
    socket.on("gamestate tiles", handleTilesUpdate);
    socket.on("gamestate group", handleGroupUpdate);
    socket.on("gamestate groups", handleGroupsUpdate);
    socket.on("gamestate building", handleBuildingUpdate);

    // Request initial data
    requestTiles();

    return () => {
      // Clean up socket listeners
      socket.off("your id");
      socket.off("gamestate tiles");
      socket.off("gamestate group");
      socket.off("gamestate groups");
      socket.off("gamestate building");
    };
  }, [socket, engine, world, uid]);

  return {
    world,
    selection,
    setSelection,
    registerRenderer,
    uid,
    // Add more state and methods as needed
    zoomIn: () => engine?.zoomIn(),
    zoomOut: () => engine?.zoomOut(),
    resetZoom: () => engine?.resetZoom(),
    centerViewport: (x = 0, y = 0) => engine?.centerViewport(x, y),
  };
}
