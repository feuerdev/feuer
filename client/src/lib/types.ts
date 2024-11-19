import { Tile } from "@shared/objects";

export type ClientTile = Tile & {
  visible: boolean;
}

export const enum SelectionType {
  None = 0,
  Group = 1,
  Tile = 2,
  Building = 3,
}
