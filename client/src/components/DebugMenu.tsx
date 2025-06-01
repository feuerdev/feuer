import React, { useState, useEffect } from "react";

const DebugMenu: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const isDevelopment = process.env.NODE_ENV === "development";

  // Handler to toggle visibility
  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  // Effect to add/remove keydown listener for toggling the menu
  useEffect(() => {
    if (!isDevelopment) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Example: Toggle with Ctrl + D or Cmd + D
      if ((event.ctrlKey || event.metaKey) && event.key === "m") {
        event.preventDefault();
        toggleVisibility();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDevelopment, toggleVisibility]); // Add toggleVisibility to dependencies

  if (!isDevelopment || !isVisible) {
    return null; // Don't render anything if not in development or not visible
  }

  return (
    <div
      style={{
        position: "absolute",
        top: "10px",
        right: "10px",
        backgroundColor: "rgba(50, 50, 50, 0.9)",
        color: "white",
        padding: "15px",
        borderRadius: "8px",
        zIndex: 1000, // Ensure it's on top
        minWidth: "300px",
        maxHeight: "80vh",
        overflowY: "auto",
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "1.2em" }}>Debug Menu</h3>
        <button
          onClick={toggleVisibility}
          style={{
            background: "transparent",
            border: "none",
            color: "white",
            fontSize: "1.5em",
            cursor: "pointer",
          }}
        >
          &times;
        </button>
      </div>
      <p>Press Ctrl+M (or Cmd+M on Mac) to toggle this menu.</p>
      {/* Debug functionalities will be added here */}
      <div>
        <p>Debug options will go here...</p>
      </div>
    </div>
  );
};

export default DebugMenu;
