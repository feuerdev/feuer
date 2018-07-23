export default class Gun {

  public angleHorizontalActual: number = 0;
  public angleVerticalActual: number = 0;
  public angleHorizontalRequested: number = 0;
  public angleVerticalRequested: number = 0;
  public turnspeed: number = 1;
  public velocity: number = 3;
  public minAngleVertical: number = 3;
  public maxAngleVertical: number = 80;
  public minAngleHorizontal: number = -115;
  public maxAngleHorizontal: number = 115;
}