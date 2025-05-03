import { create } from "zustand";
import { Selection, SelectionType } from "./types";
import { World } from "@shared/objects";
import { Socket } from "socket.io-client";
import { Engine } from "./Engine";
import { initializeSocket } from "./socket";
import { Application } from "pixi.js";

type SelectionState = {
  selection: Selection;
  setSelection: (selection: Selection) => void;
};

type WorldState = {
  world: World;
  setWorld: (world: World) => void;
};

type SocketState = {
  socket: Socket;
  connected: boolean;
  setConnected: (connected: boolean) => void;
};

type EngineState = {
  engine: Engine;
};

type PixiAppState = {
  app: Application | null;
  setApp: (app: Application | null) => void;
};

export const usePixiAppStore = create<PixiAppState>((set) => ({
  app: null,
  setApp: (app) => set({ app }),
}));

export const useEngineStore = create<EngineState>(() => ({
  engine: new Engine(),
}));

export const useSocketStore = create<SocketState>((set) => ({
  socket: initializeSocket(),
  connected: false,
  setConnected: (connected: boolean) => set({ connected }),
}));

export const useSelectionStore = create<SelectionState>((set) => ({
  selection: {
    type: SelectionType.None,
  },
  setSelection: (selection) => set({ selection }),
}));

export const useWorldStore = create<WorldState>((set) => ({
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
