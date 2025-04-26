# Integrating Pixi.js with React

This guide explains how to properly integrate Pixi.js canvas rendering with React components, focusing on maintaining performance while respecting React's lifecycle.

## Table of Contents

- [Basic Integration with useRef](#basic-integration-with-useref)
- [Advanced Ref Usage Patterns](#advanced-ref-usage-patterns)
- [Complete Game Wrapper Component](#complete-game-wrapper-component)
- [Handling Remote State with WebSockets](#handling-remote-state-with-websockets)
- [Best Practices](#best-practices)

## Basic Integration with useRef

The fundamental approach uses React's `useRef` to create a stable reference to the DOM element and Pixi application.

```jsx
import React, { useRef, useEffect } from "react";
import * as PIXI from "pixi.js";

const PixiComponent = () => {
  // Ref for the DOM container
  const containerRef = useRef(null);

  // Ref for the Pixi application instance
  const pixiAppRef = useRef(null);

  useEffect(() => {
    // Only create the Pixi application once when the component mounts
    if (containerRef.current && !pixiAppRef.current) {
      // Initialize Pixi application
      pixiAppRef.current = new PIXI.Application({
        width: 800,
        height: 600,
        backgroundColor: 0x1099bb,
      });

      // Attach the Pixi canvas to the DOM
      containerRef.current.appendChild(pixiAppRef.current.view);

      // Setup your visualization here
      setupPixiScene(pixiAppRef.current);
    }

    // Cleanup function
    return () => {
      if (pixiAppRef.current) {
        pixiAppRef.current.destroy(true);
        pixiAppRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} />;
};

function setupPixiScene(app) {
  // Add your Pixi.js content here
  // Example: create a simple shape
  const graphics = new PIXI.Graphics();
  graphics.beginFill(0xff0000);
  graphics.drawRect(0, 0, 100, 100);
  graphics.position.set(app.screen.width / 2, app.screen.height / 2);
  graphics.pivot.set(50, 50);

  app.stage.addChild(graphics);
}
```

## Advanced Ref Usage Patterns

### 1. Separating Pixi Instance from Scene Updates

```jsx
const GameComponent = ({ sceneData }) => {
  const containerRef = useRef(null);
  const pixiAppRef = useRef(null);
  const sceneStateRef = useRef({
    // Store any persistent scene state here
    elements: [],
  });

  // Initialize Pixi - runs only once
  useEffect(() => {
    if (!pixiAppRef.current && containerRef.current) {
      pixiAppRef.current = new PIXI.Application({
        width: 800,
        height: 600,
        backgroundColor: 0x1099bb,
      });
      containerRef.current.appendChild(pixiAppRef.current.view);
    }

    return () => {
      if (pixiAppRef.current) {
        pixiAppRef.current.destroy(true);
        pixiAppRef.current = null;
      }
    };
  }, []);

  // Update scene when data changes
  useEffect(() => {
    if (pixiAppRef.current && sceneData) {
      updateScene(pixiAppRef.current, sceneData, sceneStateRef.current);
    }
  }, [sceneData]);

  return <div ref={containerRef} />;
};

// Implementation would be specific to your application
function updateScene(app, sceneData, sceneState) {
  // Update your Pixi.js scene based on the new data
}
```

### 2. Handling Resize Events

```jsx
// Inside your component:
useEffect(() => {
  const handleResize = () => {
    if (pixiAppRef.current && containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      pixiAppRef.current.renderer.resize(width, height);

      // Update scene layout based on new dimensions
      updateSceneLayout(pixiAppRef.current.stage, width, height);
    }
  };

  window.addEventListener("resize", handleResize);
  handleResize(); // Initial sizing

  return () => window.removeEventListener("resize", handleResize);
}, []);

function updateSceneLayout(stage, width, height) {
  // Adjust scene elements based on new dimensions
  // For example, center the content:
  stage.position.set(width / 2, height / 2);

  // Other layout adjustments...
}
```

### 3. Connecting React State to Pixi Objects

```jsx
const PixiUIComponent = ({ uiData }) => {
  const containerRef = useRef(null);
  const pixiAppRef = useRef(null);
  const uiElementsRef = useRef({
    // References to Pixi text, sprites, etc.
  });

  // Initialize Pixi and create UI elements (once)
  useEffect(() => {
    if (!pixiAppRef.current && containerRef.current) {
      pixiAppRef.current = new PIXI.Application({
        width: 800,
        height: 600,
        transparent: true,
      });
      containerRef.current.appendChild(pixiAppRef.current.view);

      // Create UI elements
      const textElement = new PIXI.Text("Sample Text", { fill: 0xffffff });
      textElement.position.set(20, 20);
      pixiAppRef.current.stage.addChild(textElement);
      uiElementsRef.current.text = textElement;

      // Add other UI elements...
    }

    return () => {
      if (pixiAppRef.current) {
        pixiAppRef.current.destroy(true);
        pixiAppRef.current = null;
      }
    };
  }, []);

  // Update Pixi UI elements when React props change
  useEffect(() => {
    if (uiElementsRef.current.text && uiData) {
      uiElementsRef.current.text.text = uiData.message || "Default Text";
      // Update other UI elements...
    }
  }, [uiData]);

  return <div ref={containerRef} />;
};
```

## Complete Game Wrapper Component

For complex applications, it's beneficial to completely separate the rendering engine from React:

```jsx
// RenderEngine.js - Encapsulates all Pixi.js logic
class RenderEngine {
  constructor(width, height, backgroundColor = 0x1099bb) {
    this.app = new PIXI.Application({
      width,
      height,
      backgroundColor,
      antialias: true,
    });

    this.elements = {};
    this.state = {
      // Application state goes here
    };

    // Setup main ticker
    this.app.ticker.add(this.update.bind(this));
  }

  mount(container) {
    if (container && !container.contains(this.app.view)) {
      container.appendChild(this.app.view);
    }
  }

  // Load assets
  loadAssets() {
    return new Promise((resolve) => {
      // Load your textures, sprites, etc.
      PIXI.Assets.load([
        // Your asset list
        { alias: "texture1", src: "assets/texture1.png" },
      ]).then(() => {
        this.setupElements();
        resolve();
      });
    });
  }

  setupElements() {
    // Create your scene elements
    // Store references in this.elements for later manipulation
  }

  // Main update loop
  update(delta) {
    // Update your scene elements here
    // This runs on every frame
  }

  // Handle input
  handleInput(type, data) {
    // Process user input
    // Example: keyboard, mouse, touch events
  }

  // Clean up resources
  destroy() {
    this.app.ticker.stop();
    this.app.destroy(true, {
      children: true,
      texture: true,
      baseTexture: true,
    });
  }

  // Get current state for React components
  getState() {
    return { ...this.state };
  }
}

// React wrapper component
import React, { useRef, useEffect, useState } from "react";
import * as PIXI from "pixi.js";
import { RenderEngine } from "./RenderEngine";

const PixiWrapper = ({ width = 800, height = 600, onStateChange }) => {
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [appState, setAppState] = useState({});

  // Initialize rendering engine
  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new RenderEngine(width, height);

      // Load assets and setup
      setIsLoading(true);
      engineRef.current.loadAssets().then(() => {
        setIsLoading(false);
      });
    }

    // Mount Pixi canvas to the DOM
    if (containerRef.current && engineRef.current) {
      engineRef.current.mount(containerRef.current);
    }

    // Cleanup function
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [width, height]);

  // Keyboard input listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (engineRef.current) {
        engineRef.current.handleInput("keydown", e);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Sync engine state with React state
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (engineRef.current) {
        const currentState = engineRef.current.getState();
        setAppState(currentState);

        // Notify parent components of state changes
        if (onStateChange) {
          onStateChange(currentState);
        }
      }
    }, 100); // Update UI at a lower frequency than the render loop

    return () => clearInterval(syncInterval);
  }, [onStateChange]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            color: "white",
            zIndex: 10,
          }}
        >
          Loading assets...
        </div>
      )}

      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};

// Usage example
const AppContainer = () => {
  const [state, setState] = useState({});

  return (
    <div className="app-container">
      <div className="ui-container">
        {/* Your React UI components here */}
        <div>{JSON.stringify(state)}</div>
      </div>

      <div
        className="canvas-container"
        style={{ width: "800px", height: "600px" }}
      >
        <PixiWrapper width={800} height={600} onStateChange={setState} />
      </div>
    </div>
  );
};
```

## Handling Remote State with WebSockets

For applications where state is primarily managed remotely and streamed via WebSockets, you can adapt the wrapper pattern to efficiently handle real-time updates:

```jsx
// RemoteStateEngine.js
class RemoteStateEngine {
  constructor(width, height) {
    this.app = new PIXI.Application({
      width,
      height,
      backgroundColor: 0x1099bb,
      antialias: true,
    });

    this.elements = {};
    this.remoteState = {}; // Latest state from server
    this.localState = {}; // Local state and interpolations

    // Setup main update loop
    this.app.ticker.add(this.update.bind(this));
  }

  mount(container) {
    if (container && !container.contains(this.app.view)) {
      container.appendChild(this.app.view);
    }
  }

  // Initialize scene and assets
  initialize() {
    return new Promise((resolve) => {
      PIXI.Assets.load([
        // Load assets
      ]).then(() => {
        this.setupElements();
        resolve();
      });
    });
  }

  setupElements() {
    // Create visual elements that will be updated from remote state
  }

  // Process incoming state from WebSocket
  processRemoteState(state) {
    // Store the latest state from server
    this.remoteState = state;

    // Process server timestamp and data for interpolation
    // (Important for smooth animations)
    this.lastStateTimestamp = Date.now();
  }

  // Main update loop
  update(delta) {
    // Calculate interpolation between states if needed
    const interpolation = this.calculateInterpolation();

    // Update visual elements based on remote state and interpolation
    this.updateVisuals(interpolation);
  }

  calculateInterpolation() {
    // If using interpolation between updates:
    // return a value between 0 and 1 indicating how far we are between states
    // This helps create smooth transitions even if server updates are less frequent
    return Math.min(
      1,
      (Date.now() - this.lastStateTimestamp) / this.updateInterval
    );
  }

  updateVisuals(interpolation) {
    // Update positions, animations, etc. based on remote state
    // Use interpolation for smoother transitions
    if (!this.remoteState || Object.keys(this.remoteState).length === 0) return;

    // Example: update entities based on remote state
    if (this.remoteState.entities) {
      this.remoteState.entities.forEach((entity) => {
        const visualElement = this.elements[entity.id];
        if (visualElement) {
          // Apply state to visual element
          visualElement.position.set(entity.x, entity.y);
          // Apply other properties...
        }
      });
    }
  }

  destroy() {
    this.app.ticker.stop();
    this.app.destroy(true, {
      children: true,
      texture: true,
      baseTexture: true,
    });
  }

  getState() {
    // Combine remote and local state for React components
    return {
      ...this.remoteState,
      ...this.localState,
    };
  }
}

// React component with WebSocket integration
import React, { useRef, useEffect, useState, useCallback } from "react";
import * as PIXI from "pixi.js";
import { RemoteStateEngine } from "./RemoteStateEngine";
import useWebSocket from "react-use-websocket"; // Or your preferred WebSocket hook

const WebSocketPixiComponent = ({ width = 800, height = 600 }) => {
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // WebSocket setup
  const { sendMessage, lastMessage, readyState } = useWebSocket(
    "wss://your-websocket-server.com", // Your WebSocket endpoint
    {
      onOpen: () => setIsConnected(true),
      onClose: () => setIsConnected(false),
      // Optional: shouldReconnect: (closeEvent) => true, // for auto-reconnect
    }
  );

  // Initialize the engine
  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new RemoteStateEngine(width, height);

      // Initialize engine and load assets
      setIsLoading(true);
      engineRef.current.initialize().then(() => {
        setIsLoading(false);
      });
    }

    // Mount canvas to DOM
    if (containerRef.current && engineRef.current) {
      engineRef.current.mount(containerRef.current);
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [width, height]);

  // Process WebSocket messages
  useEffect(() => {
    if (lastMessage && engineRef.current) {
      try {
        const data = JSON.parse(lastMessage.data);
        engineRef.current.processRemoteState(data);

        // Optional: Log or handle specific events
        if (data.type === "event") {
          console.log("Event received:", data.event);
          // Handle special events like game start/end
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    }
  }, [lastMessage]);

  // Example: Send input to server
  const handleKeyDown = useCallback(
    (e) => {
      if (!isConnected) return;

      // Send user input to server
      sendMessage(
        JSON.stringify({
          type: "input",
          key: e.key,
          timestamp: Date.now(),
        })
      );
    },
    [isConnected, sendMessage]
  );

  // Attach input listeners
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            color: "white",
            zIndex: 10,
          }}
        >
          Loading assets...
        </div>
      )}

      {!isConnected && !isLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            color: "white",
            zIndex: 5,
          }}
        >
          Connecting to server...
        </div>
      )}

      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};

// Usage example
const RemoteControlledApp = () => {
  return (
    <div className="app-container">
      <div className="ui-container">
        {/* UI Components */}
        <div className="status-bar">
          Status: {isConnected ? "Connected" : "Disconnected"}
        </div>
      </div>

      <div
        className="canvas-container"
        style={{ width: "800px", height: "600px" }}
      >
        <WebSocketPixiComponent width={800} height={600} />
      </div>
    </div>
  );
};
```

### Key Considerations for WebSocket Integration

1. **State Synchronization**

   - Keep remote (server) state separate from local (client) state
   - Use timestamps for accurate state reconciliation
   - Consider implementing interpolation for smooth visuals

2. **Connection Management**

   - Handle connection drops and reconnections gracefully
   - Show appropriate UI indicators for connection state
   - Buffer input during connection loss if appropriate

3. **Performance Optimization**

   - Only update visual elements that have changed
   - Use delta compression if sending frequent updates
   - Consider throttling WebSocket updates for high-frequency data

4. **Latency Compensation**

   - Implement client-side prediction for responsive input
   - Use interpolation between state updates for smooth animation
   - Consider extrapolation for moving objects when updates are delayed

5. **Error Handling**
   - Validate incoming WebSocket data before processing
   - Implement fallback rendering for missing data
   - Log and recover from parsing or processing errors

## Best Practices

1. **Initialization**

   - Create the Pixi application only once (using empty dependency array in useEffect)
   - Always clean up resources in the useEffect cleanup function

2. **Performance**

   - Keep Pixi.js rendering separate from React's rendering cycle
   - Avoid recreating the application on every render
   - Use refs to store and access Pixi objects
   - Sync state to React at a controlled rate (not every frame)

3. **Input Handling**

   - Handle input directly in the render engine
   - Use React event handlers to bridge to the render engine

4. **Responsiveness**

   - Add resize handlers to adjust the canvas size
   - Reposition elements when the container is resized

5. **State Management**

   - For simple applications, use React state and pass to Pixi via refs
   - For complex applications, maintain state inside the render engine
   - Sync only necessary data back to React for UI components

6. **Asset Loading**

   - Show loading indicators while assets are being loaded
   - Load assets before starting the main loop

7. **UI Integration**
   - Use React for UI elements outside the canvas
   - Use Pixi for UI elements that need to be part of the canvas

By following these patterns, you can create robust interactive visualizations and applications that leverage both the performance of Pixi.js and the component architecture of React.
