import { create } from "zustand";
import { Selection, SelectionType } from "./types";
import { World } from "@shared/objects";
import { Socket } from "socket.io-client";

type AppState = {
  socket: Socket | null;
  userId: string | null;
  connected: boolean;
  setSocket: (socket: Socket) => void;
  setUserId: (userId: string) => void;
  setConnected: (connected: boolean) => void;
  selection: Selection;
  setSelection: (selection: Selection) => void;
  world: World;
  setWorld: (world: World) => void;
};

export const useStore = create<AppState>((set) => ({
  socket: null,
  userId: null,
  connected: false,
  setSocket: (socket) => set({ socket }),
  setUserId: (userId) => set({ userId }),
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
  },
  setWorld: (world) => set({ world }),
}));
