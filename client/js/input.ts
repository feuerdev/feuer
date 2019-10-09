import Vector2 from "../../shared/vector2";
import Hex, { Layout } from "../../shared/hex";
import InputListener from "./listener_input";
import { GameloopListener } from "../../shared/gameloop";

export default class Input implements GameloopListener {
  onUpdate(deltafactor: number) {
    this.updateCamera();
  }

  private canvas_input;
  private layout:Layout;

  private listeners_input: InputListener[] = [];

  private cursorWorld: Vector2 = new Vector2();
  private cursorCanvas: Vector2 = new Vector2();
  private cursorCanvasLast: Vector2 = new Vector2();

  private zoomFactor: number = 2;
  public currentZoom: number = 1;
  public cameraPos: Vector2 = new Vector2();

  private selectedHex: Hex;

  private isM2Down: boolean = false;
  public isDragging: boolean = false;
  private dragDistance: number = 0;

  constructor(canvas_input, layout) {
    this.canvas_input = canvas_input;
    this.layout = layout;

    this.setupKeys();
    this.setupMouse();
  }

  setupKeys() {
    if (window) {
      window.addEventListener("keydown", event => {
        for (let listener of this.listeners_input) {
          listener.onKeyDown(event);
        }
      }, false);

      window.addEventListener("keyup", event => {
        switch (event.keyCode) {
          case 187: this.zoomIn(); break;//+
          case 189: this.zoomOut(); break;//-   
          case 191: this.zoomReset(); break;//#
          default:
            for (let listener of this.listeners_input) {
              listener.onKeyUp(event);
            }
            break;
          //case 32: this.socket.emit("input shoot"); break;//# 
        }

      }, false);
    }
  }

  setupMouse() {
    if (window && this.canvas_input) {
      /**
       * Linksklick
       */
      window.addEventListener("click", event => {
        switch (event.which) {
          case 1: { //Linksclick
            this.selectedHex = this.layout.pixelToHex(this.cursorWorld).round();
            for (let listener of this.listeners_input) {
              listener.onHexSelected(this.selectedHex);
            }
            for (let listener of this.listeners_input) {
              listener.onLeftClick(this.cursorCanvas, this.cursorWorld);
            }
            break;
          }
        }
      });

      /**
       * Rechtsklick
       */
      this.canvas_input.mouseup(event => {
        if (event.button === 2) { //Rightclick
          this.isM2Down = false;
          this.isDragging = false;
          if (this.dragDistance < config.click_distance_threshold) {
            for (let listener of this.listeners_input) {
              listener.onRightClick(this.cursorCanvas, this.cursorWorld);
            }
          }
          this.dragDistance = 0;
        }
      });

      /**
       * Mausrad
       */
      window.addEventListener("mousewheel", event => {
        event.wheelDelta > 0 ? this.zoomIn() : this.zoomOut();
        this.updateCursor(event);
      }, false);

      /**
       * Cursorposition und Dragging
       */
      this.canvas_input.mousemove(event => {
        if (this.isM2Down) {
          this.isDragging = true;
          this.dragDistance += (Math.abs(this.cursorCanvas.x - event.offsetX) + Math.abs(this.cursorCanvas.y - event.offsetY));
        }
        this.updateCursor(event);
      });

      /**
      * Für Dragging
      */
      this.canvas_input.mousedown(event => {
        if (event.button === 2) { //Rightclick
          this.isM2Down = true;
        }
      });

      /**
       * Für Dragging
       */
      this.canvas_input.mouseout(() => {
        this.isM2Down = false;
        this.isDragging = false;
      });
    }
  }

  private updateCursor(event) {
    this.cursorCanvas.x = event.offsetX;
    this.cursorCanvas.y = event.offsetY;
    this.cursorWorld.x = (event.offsetX / this.currentZoom) + this.cameraPos.x;
    this.cursorWorld.y = (event.offsetY / this.currentZoom) + this.cameraPos.y;
  }

  updateCamera() {
    if(this.isDragging) {
      this.cameraPos.x -= Math.round((this.cursorCanvas.x - this.cursorCanvasLast.x) / this.currentZoom);
      this.cameraPos.y -= Math.round((this.cursorCanvas.y - this.cursorCanvasLast.y) / this.currentZoom);
      for (let listener of this.listeners_input) {
        listener.onCameraPosition(this.cameraPos);
      }
    }
    this.cursorCanvasLast.x = this.cursorCanvas.x;
    this.cursorCanvasLast.y = this.cursorCanvas.y;
  }

  zoomIn() {
    this.zoom(this.zoomFactor);
  }

  zoomOut() {
    this.zoom(1 / this.zoomFactor);
  }

  zoomReset() {
    const factor = 1 / this.currentZoom;
    this.zoom(factor);
  }

  zoom(factor: number) {
    const newZoom = this.currentZoom * factor;
    if (newZoom <= config.zoom_max && newZoom >= config.zoom_min) {
      this.currentZoom *= factor;

      // this.camera.pos.x += ((this.input.posCursorCanvas.x) * factor);
      // this.camera.pos.y += ((this.input.posCursorCanvas.y) * factor);

      for (let listener of this.listeners_input) {
        listener.onZoom(factor, this.currentZoom);
      }
    }
  }

  public addListener(listener: InputListener) {
    this.listeners_input.push(listener);
  }

  public removeListener(listener: InputListener) {
    const index = this.listeners_input.indexOf(listener, 0);
    if (index > -1) {
      this.listeners_input.splice(index, 1);
    }
  }

}