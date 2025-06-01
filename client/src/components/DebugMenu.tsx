import React, { useState, useEffect, useCallback } from "react";
import { useStore } from "@/lib/state";
import { SelectionType } from "@shared/objects";

const DebugMenu: React.FC = () => {
  const isDevelopment = process.env.NODE_ENV === "development";
  const [isVisible, setIsVisible] = useState(isDevelopment);

  const selection = useStore((state) => state.selection);
  const socket = useStore((state) => state.socket);

  // Handler to toggle visibility
  const toggleVisibility = useCallback(() => {
    setIsVisible(!isVisible);
  }, [isVisible]);

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

  const handleDeleteSelectedEntity = () => {
    if (!socket || !selection || selection.id === undefined) {
      console.warn("DebugMenu: No entity selected or socket not available.");
      return;
    }
    console.log(
      `DebugMenu: Requesting deletion of ${selection.type} with ID ${selection.id}`
    );
    socket.emit("debug:killEntity", {
      type: selection.type,
      id: selection.id,
    });
  };

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
      <p style={{ fontSize: "0.9em", color: "#ccc", marginTop: 0 }}>
        Press Ctrl+M (or Cmd+M) to toggle.
      </p>

      {/* Delete Selected Entity Button */}
      <div style={{ marginTop: "15px" }}>
        <button
          onClick={handleDeleteSelectedEntity}
          disabled={
            !selection ||
            selection.id === undefined ||
            selection.type === SelectionType.Tile ||
            selection.type === SelectionType.None ||
            selection.type === SelectionType.Battle
          }
          style={{
            padding: "8px 12px",
            backgroundColor:
              selection &&
              selection.id !== undefined &&
              selection.type !== SelectionType.Tile &&
              selection.type !== SelectionType.None &&
              selection.type !== SelectionType.Battle
                ? "#dc3545"
                : "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor:
              selection &&
              selection.id !== undefined &&
              selection.type !== SelectionType.Tile &&
              selection.type !== SelectionType.None &&
              selection.type !== SelectionType.Battle
                ? "pointer"
                : "not-allowed",
            width: "100%",
            fontSize: "1em",
          }}
        >
          Delete Selected Entity (ID: {selection?.id ?? "N/A"})
        </button>
        {(selection?.type === SelectionType.Tile ||
          selection?.type === SelectionType.None ||
          selection?.type === SelectionType.Battle) &&
          selection?.id !== undefined && (
            <p
              style={{ fontSize: "0.8em", color: "#ffc107", marginTop: "5px" }}
            >
              Cannot delete selected {selection.type}. Please select a group or
              building.
            </p>
          )}
      </div>

      {/* More debug functionalities will be added below */}
      <div
        style={{
          marginTop: "20px",
          borderTop: "1px solid #444",
          paddingTop: "10px",
        }}
      >
        <p>More debug options will go here...</p>
      </div>
    </div>
  );
};

export default DebugMenu;
