import { create } from "zustand";
import { Selection, SelectionType } from "./types";
import { World } from "@shared/objects";
import { Socket } from "socket.io-client";
import { randomName } from "./utils";

type AppState = {
  socket: Socket | null;
  connected: boolean;
  setSocket: (socket: Socket) => void;
  setConnected: (connected: boolean) => void;
  selection: Selection;
  setSelection: (selection: Selection) => void;
  world: World;
  setWorld: (world: World) => void;
};

export const uid =
  new URLSearchParams(window.location.search).get("user") || randomName();

export const useStore = create<AppState>((set) => ({
  socket: null,
  connected: false,
  setSocket: (socket) => set({ socket }),
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
