import Hex from "../../../shared/hex";

export default class Tile {

  private hex:Hex;
  public height:number;

  constructor(q:number, r:number) {
    this.hex = new Hex(q, r, -q-r);
  }

}