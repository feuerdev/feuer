import { create } from "zustand";
import { Selection, SelectionType } from "./types";
import { World } from "@shared/objects";
import { Socket } from "socket.io-client";
import { Engine } from "./Engine";
import { initializeSocket } from "./socket";
import { Application } from "pixi.js";

type AppState = {
  pixi: Application | null;
  setPixi: (pixi: Application | null) => void;

  engine: Engine;

  socket: Socket;
  connected: boolean;
  setConnected: (connected: boolean) => void;

  selection: Selection;
  setSelection: (selection: Selection) => void;

  world: World;
  setWorld: (world: World) => void;
};

export const useStore = create<AppState>((set) => ({
  pixi: null,
  setPixi: (pixi) => set({ pixi }),
  engine: new Engine(),
  socket: initializeSocket(),
  connected: false,
  setConnected: (connected) => set({ connected }),
  selection: {
    type: SelectionType.None,
  },
  setSelection: (selection) => set({ selection }),
  world: {
    tiles: {},
    groups: {},
    buildings: {},
    battles: [],
    playerRelations: {},
    idCounter: 0,
    players: {},
    units: [],
  },
  setWorld: (world) => set({ world }),
}));
