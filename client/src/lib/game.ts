import { create, Vector2 } from "@shared/vector2";
import * as Util from "@shared/util";
import * as PlayerRelation from "@shared/relation";
import { Hex, equals, hash, neighborsRange, round } from "@shared/hex";
import { Battle, Building, Group, Tile, World } from "@shared/objects";
import { ClientTile, Selection, SelectionType } from "./types";
import { Hashtable } from "@shared/util";
import { Point, Sprite } from "pixi.js";
import socket from "./socket";
import {
  layout,
  removeItem,
  updateScenegraphBuilding,
  updateScenegraphGroup,
  updateScenegraphTile,
  updateSelection,
  viewport,
} from "./renderer";
import { atom, createStore } from "jotai";

export const world: World = {
  tiles: {},
  groups: {},
  buildings: {},
  battles: [],
  playerRelations: {},
  idCounter: 0,
  players: {},
  units: [],
};
export let uid: string;
export const store = createStore();
export const selectionAtom = atom<Selection>({ type: SelectionType.None });

const keyUpHandler = (event: KeyboardEvent) => {
  switch (event.key) {
    case "=":
    case "+":
      viewport.zoom(-200, true);
      break;
    case "-":
      viewport?.zoom(200, true);
      break;
    case "/":
      viewport?.setZoom(1, true);
      break;
    case "r":
    case "R":
      viewport!.center = new Point(0, 0);
      break;
    default:
      break;
  }
};

export const removeAllListeners = () => {
  console.log("Removing all listeners");
  window.removeEventListener("keyup", keyUpHandler, false);
  socket.removeAllListeners();
  viewport.removeAllListeners();
};

export const setListeners = () => {
  console.log("Setting all listeners");
  window.addEventListener("keyup", keyUpHandler, false);

  viewport.on("clicked", (click) => {
    const point = create(click.world.x, click.world.y);
    switch (click.event.data.button) {
      case 0: //Left
        trySelect(point);
        break;
      case 2: //Right
        const clickedHex = round(layout.pixelToHex(point));
        if (
          clickedHex &&
          store.get(selectionAtom).type === SelectionType.Group
        ) {
          socket.emit("request movement", {
            selection: store.get(selectionAtom).id,
            target: clickedHex,
          });
        }
        break;
    }
  });

  socket.on("gamestate tiles", (detail) => {
    const tiles: Util.Hashtable<ClientTile> =
      detail as unknown as Util.Hashtable<ClientTile>;
    const visibleHexes: Hashtable<Hex> = {};
    Object.values(world.groups).forEach((group) => {
      neighborsRange(group.pos, group.spotting).forEach((hex) => {
        visibleHexes[hash(hex)] = hex;
      });
    });
    Object.values(world.buildings).forEach((building) => {
      neighborsRange(building.position, building.spotting).forEach((hex) => {
        visibleHexes[hash(hex)] = hex;
      });
    });

    Object.entries(tiles).forEach(([id, tile]) => {
      world.tiles[id] = tile;
    });

    Object.values(world.tiles).forEach((tile: Tile) => {
      const cTile = tile as ClientTile;
      const oldVisibility = cTile.visible;
      cTile.visible = visibleHexes[hash(tile.hex)] !== undefined;
      if (oldVisibility !== cTile.visible) {
        updateScenegraphTile(cTile);
      }
    });

    //TODO: refresh selection?
  });

  socket.on("gamestate group", (detail) => {
    const group: Group = detail as unknown as Group;
    world.groups[group.id] = group;
    //TODO: refresh selection?
  });

  socket.on("gamestate groups", (detail) => {
    const groups: Hashtable<Group> = detail as unknown as Hashtable<Group>;
    const newGroups: Hashtable<Group> = {};
    const visitedOldGroups: Hashtable<boolean> = {};

    let needsTileUpdate = false;

    // Merge groups
    Object.values(groups).forEach((receivedGroup) => {
      const oldGroup = world.groups[receivedGroup.id];
      visitedOldGroups[receivedGroup.id] = true;
      // Check if group is new, has moved or upgraded
      // Redraw/request tiles accordingly
      if (
        !oldGroup ||
        !equals(oldGroup.pos, receivedGroup.pos) ||
        oldGroup.spotting !== receivedGroup.spotting
      ) {
        updateScenegraphGroup(receivedGroup);
        needsTileUpdate = true;
      }

      // If group is new and foreign, request relation
      if (
        !oldGroup &&
        receivedGroup.owner !== uid &&
        world.playerRelations[PlayerRelation.hash(receivedGroup.owner, uid)] ===
          undefined
      ) {
        window.dispatchEvent(
          new CustomEvent("request relation", {
            detail: {
              id1: receivedGroup.owner,
              id2: uid,
            },
          })
        );
      }

      newGroups[receivedGroup.id] = receivedGroup;
    });

    // Remove groups that are not in the new list
    Object.entries(world.groups).forEach(([id, oldGroup]) => {
      if (!visitedOldGroups[id]) {
        removeItem(oldGroup.id);
        needsTileUpdate = true;
      }
    });

    // Server is sending exhaustive list of groups, so client can clean his own list
    world.groups = newGroups;

    if (needsTileUpdate) {
      requestTiles();
    }

    //Update the selection if a group is selected (it might have moved)
    if (store.get(selectionAtom).type === SelectionType.Group) {
      updateSelection(store.get(selectionAtom));
    }

    // TODO: refresh selection?
  });

  socket.on("gamestate battles", (detail) => {
    const battles: Battle[] = detail as unknown as Battle[];
    world.battles = battles;
  });

  socket.on("gamestate buildings", (detail) => {
    const buildings: Hashtable<Building> =
      detail as unknown as Hashtable<Building>;
    const newBuildings: Hashtable<Building> = {};
    const visitedOldBuildings: Hashtable<boolean> = {};

    let needsTileUpdate = false;

    // Merge buildings
    Object.values(buildings).forEach((receivedBuilding) => {
      const oldBuilding = world.buildings[receivedBuilding.id];
      visitedOldBuildings[receivedBuilding.id] = true;
      // Check if Building is new or upgraded
      // Redraw/request tiles accordingly
      if (!oldBuilding || oldBuilding.spotting !== receivedBuilding.spotting) {
        updateScenegraphBuilding(receivedBuilding);
        needsTileUpdate = true;
      }

      // If building is new and foreign, request relation
      if (
        !oldBuilding &&
        receivedBuilding.owner !== uid &&
        world.playerRelations[
          PlayerRelation.hash(receivedBuilding.owner, uid)
        ] === undefined
      ) {
        window.dispatchEvent(
          new CustomEvent("request relation", {
            detail: {
              id1: receivedBuilding.owner,
              id2: uid,
            },
          })
        );
      }

      newBuildings[receivedBuilding.id] = receivedBuilding;
    });

    // Remove buildings that are not in the new list
    Object.entries(world.buildings).forEach(([id, oldBuilding]) => {
      if (!visitedOldBuildings[id]) {
        removeItem(oldBuilding.id);
        needsTileUpdate = true;
      }
    });

    // Server is sending exhaustive list of buildings, so client can clean his own list
    world.buildings = newBuildings;

    if (needsTileUpdate) {
      requestTiles();
    }

    //Update the selection if a building is selected (it might have updated)
    if (store.get(selectionAtom).type === SelectionType.Building) {
      updateSelection(store.get(selectionAtom));
    }
    // TODO: refresh selection?
  });

  socket.on("gamestate relation", (detail) => {
    const relation: PlayerRelation.default =
      detail as unknown as PlayerRelation.default;
    const hash = PlayerRelation.hash(relation.id1, relation.id2);
    world.playerRelations[hash] = relation;
  });
};

//#region Outgoing Messages
const requestTiles = () => {
  const hexes = new Set<Hex>();
  Object.values(world.groups).forEach((group) => {
    if (group.owner !== uid) return; // Only request tiles for own groups
    neighborsRange(group.pos, group.spotting).forEach((hex) => {
      hexes.add(hex);
    });
  });
  Object.values(world.buildings).forEach((building) => {
    if (building.owner !== uid) return; // Only request tiles for own buildings
    neighborsRange(building.position, building.spotting).forEach((hex) => {
      hexes.add(hex);
    });
  });
  socket.emit("request tiles", Array.from(hexes));
};

const trySelect = (point: Vector2) => {
  store.set(selectionAtom, { type: SelectionType.None });

  const hit = viewport.children.filter((sprite) => {
    return Util.isPointInRectangle(
      point.x,
      point.y,
      sprite.x,
      sprite.y,
      (<Sprite>sprite).width,
      (<Sprite>sprite).height
    );
  });

  for (const sprite of hit) {
    const group =
      world.groups[Util.convertSpriteNameToObjectId(sprite.name, "g")];
    if (group) {
      store.set(selectionAtom, { type: SelectionType.Group, id: group.id });
      break;
    }

    const building =
      world.buildings[Util.convertSpriteNameToObjectId(sprite.name, "b")];
    if (building) {
      store.set(selectionAtom, {
        type: SelectionType.Building,
        id: building.id,
      });
      break;
    }

    const hex = round(layout.pixelToHex(point));
    const tile = world.tiles[hash(hex)];
    if (tile) {
      store.set(selectionAtom, { type: SelectionType.Tile, id: tile.id });
    }
  }
  // Update Canvas
  updateSelection(store.get(selectionAtom));
  // Update HUD
};
