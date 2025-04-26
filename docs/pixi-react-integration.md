# Integrating Pixi.js with React

This guide explains how to properly integrate Pixi.js canvas rendering with React components, focusing on maintaining performance while respecting React's lifecycle.

## Table of Contents

- [Basic Integration with useRef](#basic-integration-with-useref)
- [Advanced Ref Usage Patterns](#advanced-ref-usage-patterns)
- [Complete Game Wrapper Component](#complete-game-wrapper-component)
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
