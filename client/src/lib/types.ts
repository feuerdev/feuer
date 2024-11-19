import { Tile } from "@shared/objects";

export type ClientTile = Tile & {
  visible: boolean;
}
