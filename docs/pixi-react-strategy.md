# Pixi.js React Integration: Improvement Strategy

This guide outlines how to improve the integration of Pixi.js with React in your codebase by applying best practices from the Pixi-React integration document.

## Current Architecture Assessment

Your current implementation follows some good practices:

- Using useRef for canvas references
- Separating renderer initialization from React state
- Proper cleanup on component unmount

However, there are several areas for improvement:

- The renderer logic is not encapsulated in a class
- Global variables are used extensively
- Event handling is scattered across files
- Direct DOM manipulation when creating the canvas

## Step-by-Step Implementation Guide

### Step 1: Create a RenderEngine Class

First, encapsulate all rendering logic in a dedicated class:

```typescript
// src/lib/RenderEngine.ts
import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";
import { Layout, Hex } from "@shared/hex";
import { Group, Building } from "@shared/objects";
import { ClientTile, Selection } from "./types";

export class RenderEngine {
  app: PIXI.Application | null = null;
  viewport: Viewport | null = null;
  elements: Record<string, PIXI.DisplayObject> = {};
  layout: Layout;
  viewportReady: boolean = false;

  constructor(hexSize: number = 40) {
    this.layout = new Layout(/* your layout initialization */);
  }

  mount(canvas: HTMLCanvasElement) {
    // Initialize PIXI application
    this.app = new PIXI.Application({
      view: canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true,
      backgroundAlpha: 1,
      autoStart: true,
    });

    // Initialize viewport
    this.initializeViewport();

    // Set up event listeners
    this.setupEventListeners();

    this.viewportReady = true;
  }

  private initializeViewport() {
    if (!this.app) return;

    this.viewport = new Viewport({
      screenWidth: this.app.screen.width,
      screenHeight: this.app.screen.height,
      worldWidth: /* your world width */,
      worldHeight: /* your world height */,
      interaction: this.app.renderer.plugins.interaction,
    });

    this.app.stage.addChild(this.viewport);

    // Configure viewport
    this.viewport.sortableChildren = true;
    this.viewport
      .clampZoom({
        maxScale: 2,
        minScale: 0.2,
      })
      .drag()
      .pinch()
      .wheel()
      .decelerate();
  }

  private setupEventListeners() {
    window.addEventListener("resize", this.handleResize);
  }

  private handleResize = () => {
    if (!this.app || !this.viewport) return;

    this.app.renderer.resize(window.innerWidth, window.innerHeight);
    this.viewport.screenWidth = this.app.screen.width;
    this.viewport.screenHeight = this.app.screen.height;
    this.viewport.resize(this.app.screen.width, this.app.screen.height);
  }

  // Add all your updating methods as class methods
  updateScenegraphGroup(group: Group) {
    if (!this.viewport) return;

    // Implementation of group updates
  }

  updateScenegraphTile(tile: ClientTile) {
    if (!this.viewport) return;

    // Implementation of tile updates
  }

  updateScenegraphBuilding(building: Building) {
    if (!this.viewport) return;

    // Implementation of building updates
  }

  updateSelection(selection: Selection) {
    if (!this.viewport) return;

    // Implementation of selection updates
  }

  // Other methods for control
  zoomIn() {
    if (!this.viewport) return;
    this.viewport.zoom(-200, true);
  }

  // Add the rest of your control methods...

  // Click handling
  registerClickHandler(handler: (point: {x: number, y: number}, button: number) => void) {
    if (!this.viewport || !this.viewportReady) return false;

    this.viewport.on("clicked", (click) => {
      handler(
        { x: click.world.x, y: click.world.y },
        click.event.data.button
      );
    });

    return true;
  }

  // Asset loading
  async loadAssets() {
    PIXI.utils.clearTextureCache();

    // Load textures
    // Return promise that resolves when loading is complete
  }

  destroy() {
    window.removeEventListener("resize", this.handleResize);

    if (this.app) {
      this.app.destroy(false);
      this.app = null;
    }

    this.viewportReady = false;
  }
}
```

### Step 2: Create a Canvas Component Using the Engine

Replace your current Canvas component with one that uses the RenderEngine:

```tsx
// src/components/game/Canvas.tsx
import { useEffect, useRef } from "react";
import { RenderEngine } from "@/lib/RenderEngine";
import { useGameState } from "@/lib/useGameState";

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<RenderEngine | null>(null);
  const { registerRenderer } = useGameState();

  useEffect(() => {
    if (!containerRef.current) return;

    // Create a new canvas element
    const canvas = document.createElement("canvas");
    canvas.className = "h-screen w-screen";
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    // Append the canvas to our container
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(canvas);

    // Create and initialize the renderer engine
    const engine = new RenderEngine();
    engineRef.current = engine;

    // Mount canvas to the engine
    engine.mount(canvas);

    // Register the engine with your game state
    registerRenderer(engine);

    // Clean up
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [registerRenderer]);

  return <div ref={containerRef} className="h-screen w-screen" />;
}
```

### Step 3: Create a Game State Hook

Create a hook to manage game state and interact with the renderer:

```typescript
// src/lib/useGameState.ts
import { useState, useCallback, useEffect } from "react";
import { RenderEngine } from "./RenderEngine";
import { useSocket } from "@/components/hooks/useSocket";
import { ClientTile, Selection, SelectionType } from "./types";
import { Group, Building } from "@shared/objects";

export function useGameState() {
  const [engine, setEngine] = useState<RenderEngine | null>(null);
  const [selection, setSelection] = useState<Selection>({});
  const { socket } = useSocket();

  // Register the renderer engine
  const registerRenderer = useCallback((rendererEngine: RenderEngine) => {
    setEngine(rendererEngine);
  }, []);

  // Handle socket events
  useEffect(() => {
    if (!socket || !engine) return;

    // Set up click handler
    engine.registerClickHandler((point, button) => {
      // Handle clicks and selection
      // This replaces your global click handler
    });

    // Listen for game state updates
    const handleTileUpdate = (tile: ClientTile) => {
      engine.updateScenegraphTile(tile);
    };

    const handleGroupUpdate = (group: Group) => {
      engine.updateScenegraphGroup(group);
    };

    const handleBuildingUpdate = (building: Building) => {
      engine.updateScenegraphBuilding(building);
    };

    // Set up socket listeners
    socket.on("updateTile", handleTileUpdate);
    socket.on("updateGroup", handleGroupUpdate);
    socket.on("updateBuilding", handleBuildingUpdate);

    return () => {
      // Clean up socket listeners
      socket.off("updateTile", handleTileUpdate);
      socket.off("updateGroup", handleGroupUpdate);
      socket.off("updateBuilding", handleBuildingUpdate);
    };
  }, [socket, engine]);

  // Update selection in the engine when selection state changes
  useEffect(() => {
    if (engine && selection.id !== undefined) {
      engine.updateSelection(selection);
    }
  }, [selection, engine]);

  return {
    registerRenderer,
    selection,
    setSelection,
    // Add more state and methods as needed
    zoomIn: () => engine?.zoomIn(),
    zoomOut: () => engine?.zoomOut(),
    resetZoom: () => engine?.resetZoom(),
    centerViewport: (x = 0, y = 0) => engine?.centerViewport(x, y),
  };
}
```

### Step 4: Update the Game Component

Update your Game component to use the new pattern:

```tsx
// src/components/game/Game.tsx
import { useSocket } from "../hooks/useSocket";
import Hud from "./Hud";
import Loading from "../ui/loading";
import { useEffect, useState } from "react";
import { Canvas } from "./Canvas";
import { GameStateProvider } from "@/lib/GameStateProvider";

export default function Game() {
  const { connected } = useSocket();
  const [texturesLoaded, setTexturesLoaded] = useState(false);

  useEffect(() => {
    const loadTextures = async () => {
      try {
        // Instead of calling a global function, this will be handled by the engine
        setTexturesLoaded(true);
      } catch (error) {
        console.error("Failed to load textures:", error);
      }
    };

    loadTextures();
  }, []);

  if (!connected) {
    return <Loading text="Connecting to server..." />;
  }

  if (!texturesLoaded) {
    return <Loading text="Loading textures..." />;
  }

  return (
    <GameStateProvider>
      <Hud />
      <Canvas />
    </GameStateProvider>
  );
}
```

### Step 5: Create a Context Provider for Game State

Create a context provider to share game state across components:

```tsx
// src/lib/GameStateProvider.tsx
import { createContext, useContext, ReactNode, useMemo } from "react";
import { useGameState } from "./useGameState";

const GameStateContext = createContext<ReturnType<typeof useGameState> | null>(
  null
);

export function GameStateProvider({ children }: { children: ReactNode }) {
  const gameState = useGameState();

  return (
    <GameStateContext.Provider value={gameState}>
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameStateContext() {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error(
      "useGameStateContext must be used within a GameStateProvider"
    );
  }
  return context;
}
```

### Step 6: Update HUD and UI Components

Update HUD and other UI components to use the new context:

```tsx
// src/components/game/Hud.tsx
import { useGameStateContext } from "@/lib/GameStateProvider";

export default function Hud() {
  const { selection, zoomIn, zoomOut, resetZoom } = useGameStateContext();

  return (
    <div className="absolute top-0 left-0 z-10 p-4">
      {/* Render HUD based on selection */}
      <div className="controls">
        <button onClick={zoomIn}>Zoom In</button>
        <button onClick={zoomOut}>Zoom Out</button>
        <button onClick={resetZoom}>Reset</button>
      </div>

      {selection.id && (
        <div className="selection-info">{/* Display selection info */}</div>
      )}
    </div>
  );
}
```

## Benefits of the New Architecture

1. **Encapsulation**: All rendering logic is encapsulated in the RenderEngine class
2. **Cleaner Component Model**: Each component has a clear responsibility
3. **No Global State**: Eliminated global variables in favor of React context
4. **Better Testability**: Components and logic can be tested independently
5. **Reusability**: The RenderEngine can be reused in other components
6. **React Performance**: Proper separation of React rendering from Pixi updates
7. **Memory Management**: Consistent cleanup of resources
8. **Separation of Concerns**: UI logic is separate from rendering logic

## Additional Recommendations

1. **Optimize Asset Loading**: Consider implementing a loading manager class
2. **Add Pixi DevTools**: Integrate Pixi DevTools for debugging
3. **Implement State Versioning**: To prevent unnecessary updates
4. **Add Error Boundaries**: For graceful failure handling
5. **Consider Using TypeScript Strict Mode**: For better type safety

## Code Reduction Strategy

In addition to the architectural improvements, here are specific opportunities to reduce code volume and complexity:

### 1. Eliminate Global Module-Level Variables

The current renderer.ts has many global variables:

```typescript
// Current approach with global variables
let viewport: Viewport;
let pixi: PIXI.Application | null = null;
let viewportReady = false;
let initialFocusSet = false;
const layout: Layout = new Layout(/* ... */);
const GLOWFILTER: Filter = new GlowFilter(/* ... */);
```

Moving these into the RenderEngine class:

```typescript
export class RenderEngine {
  private viewport: Viewport | null = null;
  private app: PIXI.Application | null = null;
  private viewportReady = false;
  private initialFocusSet = false;
  private layout: Layout;
  private glowFilter: Filter;

  constructor() {
    this.layout = new Layout(/* ... */);
    this.glowFilter = new GlowFilter(/* ... */) as unknown as Filter;
  }

  // Methods using these properties
}
```

Benefits:

- Eliminates global state that can cause side effects
- Improves testability since the state is encapsulated
- Enables multiple instances if needed

### 2. Remove Redundant Utility Functions

The current codebase has these overlapping functions:

```typescript
// Current redundant utility functions
export const isViewportReady = () => viewportReady;
export const registerViewportClickHandler = (clickHandler) => {
  /* ... */
};
export const setupViewportClickHandlers = registerViewportClickHandler; // Duplicate
```

Consolidate into a single method in the RenderEngine class:

```typescript
class RenderEngine {
  // Other properties...

  registerClickHandler(
    handler: (point: { x: number; y: number }, button: number) => void
  ): boolean {
    if (!this.viewport || !this.viewportReady) return false;

    this.viewport.on("clicked", (click) => {
      handler({ x: click.world.x, y: click.world.y }, click.event.data.button);
    });

    return true;
  }

  // The isViewportReady function becomes unnecessary as components
  // can simply check if the engine instance exists
}
```

### 3. Consolidate Entity Update Methods

Replace multiple specialized update methods with a generic one:

```typescript
// Current approach with separate methods
export const updateScenegraphGroup = (group: Group) => {
  /* ~50 lines */
};
export const updateScenegraphBuilding = (building: Building) => {
  /* ~40 lines */
};
export const updateScenegraphTile = (tile: ClientTile) => {
  /* ~40 lines */
};
```

Generic approach:

```typescript
// Define a type for all possible entities
type Entity = Group | Building | ClientTile;

// Define an enum for entity types
enum EntityType {
  Group = "group",
  Building = "building",
  Tile = "tile",
}

class RenderEngine {
  // Other properties...

  // Generic update method
  updateScenegraph(entity: Entity, type: EntityType) {
    if (!this.viewport) return;

    // Common operations for all entities
    const id = entity.id;
    const spriteName = this.getSpriteNameForEntity(entity, type);

    // Get or create sprite
    let sprite = this.viewport.getChildByName(spriteName) as PIXI.Sprite;
    if (!sprite) {
      sprite = this.createSprite(entity, type);
      this.viewport.addChild(sprite);
    }

    // Position and configure sprite based on entity type
    switch (type) {
      case EntityType.Group:
        this.configureGroupSprite(sprite, entity as Group);
        break;
      case EntityType.Building:
        this.configureBuildingSprite(sprite, entity as Building);
        break;
      case EntityType.Tile:
        this.configureTileSprite(sprite, entity as ClientTile);
        break;
    }
  }

  // Helper methods specific to each entity type
  private configureGroupSprite(sprite: PIXI.Sprite, group: Group) {
    // Group-specific sprite configuration
  }

  // Similar methods for other entity types...
}
```

This approach reduces approximately 100 lines of similar code while maintaining type safety.

### 4. Create a SpriteManager for Asset Management

Extract all sprite and texture management into a dedicated class:

```typescript
class SpriteManager {
  private textures: Map<string, PIXI.Texture> = new Map();
  private spriteCache: Map<string, PIXI.Sprite> = new Map();

  constructor() {}

  async loadTextures(sprites: string[]) {
    PIXI.utils.clearTextureCache();

    return new Promise<void>((resolve) => {
      const loader = PIXI.Loader.shared;
      loader.reset();

      sprites.forEach((sprite) => {
        loader.add(sprite, `../${sprite}.png`);
      });

      loader.load(() => {
        sprites.forEach((sprite) => {
          this.textures.set(sprite, loader.resources[sprite].texture);
        });
        resolve();
      });
    });
  }

  getTexture(key: string, variant: number = 1): PIXI.Texture {
    const textureKey = variant > 1 ? `${key}_${variant}` : key;
    return this.textures.get(textureKey) || this.textures.get("fallback")!;
  }

  // Entity-specific texture getters
  getTerrainTexture(tile: ClientTile): PIXI.Texture {
    const biomeMap: Record<Biome, { name: string; variants: number }> = {
      [Biome.Ice]: { name: "biome_ice", variants: 1 },
      [Biome.Tundra]: { name: "biome_tundra", variants: 8 },
      // ...other biomes
    };

    const biomeInfo = biomeMap[tile.biome] || biomeMap[Biome.Ice];
    const variant =
      biomeInfo.variants > 1 ? (Math.abs(tile.id) % biomeInfo.variants) + 1 : 1;

    return this.getTexture(biomeInfo.name, variant);
  }

  // Similar methods for building and unit textures
}
```

This encapsulates all texture-related logic, making it easier to test and modify.

### 5. Simplify Game Component and Texture Loading

Move texture loading out of the Game component and into the engine initialization:

Current Game.tsx:

```tsx
export default function Game() {
  const { connected } = useSocket();
  const [texturesLoaded, setTexturesLoaded] = useState(false);

  useEffect(() => {
    const loadTexturesAsync = async () => {
      await loadTextures();
      setTexturesLoaded(true);
      setListeners();
      renderInitialized.current = true;
    };

    loadTexturesAsync();
    return () => {
      /* cleanup */
    };
  }, []);

  // Loading checks and rendering
}
```

Simplified Game.tsx:

```tsx
export default function Game() {
  const { connected } = useSocket();

  // No texture loading logic here - handled by the engine

  if (!connected) {
    return <Loading text="Connecting to server..." />;
  }

  return (
    <GameStateProvider>
      <Hud />
      <Canvas />
    </GameStateProvider>
  );
}
```

Update RenderEngine to handle loading:

```typescript
class RenderEngine {
  // ...other properties
  private spriteManager = new SpriteManager();
  private loadingPromise: Promise<void> | null = null;

  // When the engine is created, it automatically starts loading
  constructor() {
    // Initialize other properties
    this.loadingPromise = this.spriteManager.loadTextures(Sprites);
  }

  // Wait for loading to complete
  async waitForLoading(): Promise<void> {
    return this.loadingPromise || Promise.resolve();
  }
}
```

Create a hook to handle loading:

```typescript
function useEngineLoading() {
  const [isLoaded, setIsLoaded] = useState(false);
  const { engine } = useGameStateContext();

  useEffect(() => {
    if (!engine) return;

    engine.waitForLoading().then(() => {
      setIsLoaded(true);
    });
  }, [engine]);

  return isLoaded;
}
```

### 6. Remove Global Events Setup from game.ts

Currently, event setup is handled globally:

```typescript
// In game.ts
export const setListeners = () => {
  socket.on("updateTile", (tile) => {
    /* ... */
  });
  socket.on("updateGroup", (group) => {
    /* ... */
  });
  // ...more listeners
};

export const removeAllListeners = () => {
  socket.off("updateTile");
  socket.off("updateGroup");
  // ...more removals
};
```

Move this into the RenderEngine class:

```typescript
class RenderEngine {
  // ...other properties

  setupSocketListeners(socket: Socket) {
    socket.on("updateTile", this.handleTileUpdate);
    socket.on("updateGroup", this.handleGroupUpdate);
    socket.on("updateBuilding", this.handleBuildingUpdate);
    // ...other listeners
  }

  removeSocketListeners(socket: Socket) {
    socket.off("updateTile", this.handleTileUpdate);
    socket.off("updateGroup", this.handleGroupUpdate);
    socket.off("updateBuilding", this.handleBuildingUpdate);
    // ...other removals
  }

  private handleTileUpdate = (tile: ClientTile) => {
    this.updateScenegraph(tile, EntityType.Tile);
  };

  // Similar handlers for other entity types
}
```

In the useGameState hook:

```typescript
export function useGameState() {
  // ...other state
  const { socket } = useSocket();

  useEffect(() => {
    if (!engine || !socket) return;

    engine.setupSocketListeners(socket);

    return () => {
      engine.removeSocketListeners(socket);
    };
  }, [engine, socket]);

  // ...rest of the hook
}
```

This approach:

- Eliminates the need for the game.ts file entirely
- Encapsulates all game logic in the RenderEngine and hooks
- Provides better cleanup and resource management

By implementing these changes, the codebase will be significantly simplified with fewer lines of code and clearer architecture.
