import Ship from "./ship";

export default class Player {  
  public initialized: boolean = false; 
  public teamId: number;
  public ship: Ship;
  public uid: string;
  public name: string;
}