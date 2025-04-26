import { createContext, useContext, ReactNode } from "react";
import { useGameState } from "./useGameState";

// Create a context for the game state
const GameStateContext = createContext<ReturnType<typeof useGameState> | null>(
  null
);

// Provider component
export function GameStateProvider({ children }: { children: ReactNode }) {
  const gameState = useGameState();

  return (
    <GameStateContext.Provider value={gameState}>
      {children}
    </GameStateContext.Provider>
  );
}

// Hook to use the game state context
export function useGameStateContext() {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error(
      "useGameStateContext must be used within a GameStateProvider"
    );
  }
  return context;
}
