import { Tile, World, SelectionType } from "@shared/objects";

declare global {
  interface Window {
    world: World;
  }
}

export type ClientTile = Tile & {
  visible: boolean;
};

export type Selection = {
  id?: number;
  type: SelectionType;
};

export enum ZIndices {
  Background = 0,
  Tiles = 10,
  TileSelection = 2,
  Nature = 3,
  Buildings = 20,
  BuildingsSelection = 5,
  Groups = 30,
  GroupsSelection = 7,
  Effects = 40,
  UI = 50,
  Debug = 100,
}
