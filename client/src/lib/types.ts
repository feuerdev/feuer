import { Tile } from "@shared/objects";

export type ClientTile = Tile & {
  visible: boolean;
};

export type Selection = {
  id?: number;
  type: SelectionType;
};

export const enum SelectionType {
  None = 0,
  Group = 1,
  Tile = 2,
  Building = 3,
}

export enum ZIndices {
  Background = 0,
  Tiles = 1,
  TileSelection = 2,
  Nature = 3,
  Buildings = 4,
  BuildingsSelection = 5,
  Units = 6,
  UnitsSelection = 7,
}