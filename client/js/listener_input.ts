export default interface InputListener {
  onHexSelected(selectedHex: import("../../shared/hex").default);
  onCameraPosition(cameraPos: import("../../shared/vector2").default);
  onZoom(factor:number, currentZoom: number);
  onRightClick(cursorCanvas: import("../../shared/vector2").default, cursorWorld: import("../../shared/vector2").default);
  onLeftClick(cursorCanvas: import("../../shared/vector2").default, cursorWorld: import("../../shared/vector2").default);
  onKeyDown(event: KeyboardEvent);
  onKeyUp(event: KeyboardEvent);

}