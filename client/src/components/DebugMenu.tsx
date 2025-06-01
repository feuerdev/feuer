import React, { useState, useEffect, useCallback } from "react";
import { useStore } from "@/lib/state";
import { SelectionType, getSelectionTypeName } from "@shared/objects";
import { Resources, create as createResources } from "@shared/resources";

const resourceKeys = Object.keys(createResources()) as Array<keyof Resources>;

type ResourceKeyType = keyof Resources;

const DebugMenu: React.FC = () => {
  const isDevelopment = process.env.NODE_ENV === "development";
  const [isVisible, setIsVisible] = useState(isDevelopment);
  // Ensure initial selectedResource is valid if resourceKeys could be empty (though unlikely here)
  const [selectedResource, setSelectedResource] = useState<ResourceKeyType>(
    resourceKeys[0] || "wood"
  ); // Fallback if keys are empty
  const [resourceAmount, setResourceAmount] = useState<number>(100);

  const selection = useStore((state) => state.selection);
  const socket = useStore((state) => state.socket);

  const toggleVisibility = useCallback(() => {
    setIsVisible(!isVisible);
  }, [isVisible]);

  useEffect(() => {
    if (!isDevelopment) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "m") {
        event.preventDefault();
        toggleVisibility();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDevelopment, toggleVisibility]);

  const handleDeleteSelectedEntity = () => {
    if (!socket || !selection || selection.id === undefined) {
      console.warn("DebugMenu: No entity selected or socket not available.");
      return;
    }
    console.log(
      `DebugMenu: Requesting deletion of ${getSelectionTypeName(
        selection.type
      )} with ID ${selection.id}`
    );
    socket.emit("debug:killEntity", {
      type: selection.type,
      id: selection.id,
    });
  };

  const handleAddSpecificResource = () => {
    if (!socket || !selection || selection.id === undefined) {
      console.warn(
        "DebugMenu: No target selected for adding resources or socket not available."
      );
      return;
    }
    if (
      selection.type !== SelectionType.Tile &&
      selection.type !== SelectionType.Group
    ) {
      console.warn(
        "DebugMenu: Resources can only be added to Tiles or Groups."
      );
      return;
    }
    console.log(
      `DebugMenu: Adding ${resourceAmount} of ${selectedResource} to ${getSelectionTypeName(
        selection.type
      )} ID ${selection.id}`
    );
    socket.emit("debug:addResources", {
      targetType: selection.type,
      targetId: selection.id,
      resources: { [selectedResource]: resourceAmount },
    });
  };

  const handleAddAllResources = () => {
    if (!socket || !selection || selection.id === undefined) {
      console.warn(
        "DebugMenu: No target selected for adding all resources or socket not available."
      );
      return;
    }
    if (
      selection.type !== SelectionType.Tile &&
      selection.type !== SelectionType.Group
    ) {
      console.warn(
        "DebugMenu: Resources can only be added to Tiles or Groups."
      );
      return;
    }
    const allResourcesToAdd: Partial<Resources> = {};
    resourceKeys.forEach((type) => {
      allResourcesToAdd[type] = 1000;
    });
    console.log(
      `DebugMenu: Adding 1000 of all resources to ${getSelectionTypeName(
        selection.type
      )} ID ${selection.id}`
    );
    socket.emit("debug:addResources", {
      targetType: selection.type,
      targetId: selection.id,
      resources: allResourcesToAdd,
    });
  };

  if (!isDevelopment || !isVisible) {
    return null;
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
        zIndex: 1000,
        minWidth: "350px",
        maxHeight: "90vh",
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

      <div style={{ borderTop: "1px solid #666", margin: "15px 0" }} />

      <div>
        <h4 style={{ marginTop: 0, marginBottom: "10px", fontSize: "1.1em" }}>
          Add Resources
        </h4>
        <div style={{ marginBottom: "10px" }}>
          <label
            htmlFor="resourceType"
            style={{ marginRight: "5px", fontSize: "0.9em" }}
          >
            Resource:
          </label>
          <select
            id="resourceType"
            value={selectedResource}
            onChange={(e) =>
              setSelectedResource(e.target.value as ResourceKeyType)
            }
            style={{
              padding: "5px",
              borderRadius: "4px",
              background: "#333",
              color: "white",
              border: "1px solid #555",
            }}
          >
            {resourceKeys.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label
            htmlFor="resourceAmount"
            style={{ marginRight: "5px", fontSize: "0.9em" }}
          >
            Amount:
          </label>
          <input
            type="number"
            id="resourceAmount"
            value={resourceAmount}
            onChange={(e) => setResourceAmount(parseInt(e.target.value, 10))}
            min="1"
            style={{
              padding: "5px",
              borderRadius: "4px",
              background: "#333",
              color: "white",
              border: "1px solid #555",
              width: "80px",
            }}
          />
        </div>
        <button
          onClick={handleAddSpecificResource}
          disabled={
            !selection ||
            selection.id === undefined ||
            (selection.type !== SelectionType.Tile &&
              selection.type !== SelectionType.Group)
          }
          style={{
            padding: "8px 12px",
            backgroundColor:
              selection &&
              selection.id !== undefined &&
              (selection.type === SelectionType.Tile ||
                selection.type === SelectionType.Group)
                ? "#28a745"
                : "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor:
              selection &&
              selection.id !== undefined &&
              (selection.type === SelectionType.Tile ||
                selection.type === SelectionType.Group)
                ? "pointer"
                : "not-allowed",
            width: "100%",
            marginBottom: "5px",
            fontSize: "1em",
          }}
        >
          Add Specific to Selected (
          {selection?.type !== undefined
            ? getSelectionTypeName(selection.type)
            : "N/A"}{" "}
          ID: {selection?.id ?? "N/A"})
        </button>
        <button
          onClick={handleAddAllResources}
          disabled={
            !selection ||
            selection.id === undefined ||
            (selection.type !== SelectionType.Tile &&
              selection.type !== SelectionType.Group)
          }
          style={{
            padding: "8px 12px",
            backgroundColor:
              selection &&
              selection.id !== undefined &&
              (selection.type === SelectionType.Tile ||
                selection.type === SelectionType.Group)
                ? "#17a2b8"
                : "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor:
              selection &&
              selection.id !== undefined &&
              (selection.type === SelectionType.Tile ||
                selection.type === SelectionType.Group)
                ? "pointer"
                : "not-allowed",
            width: "100%",
            fontSize: "1em",
          }}
        >
          Add 1000 All to Selected (
          {selection?.type !== undefined
            ? getSelectionTypeName(selection.type)
            : "N/A"}{" "}
          ID: {selection?.id ?? "N/A"})
        </button>
        {selection &&
          selection.id !== undefined &&
          selection.type !== SelectionType.Tile &&
          selection.type !== SelectionType.Group && (
            <p
              style={{ fontSize: "0.8em", color: "#ffc107", marginTop: "5px" }}
            >
              Select a Tile or Group to add resources.
            </p>
          )}
      </div>

      <div style={{ borderTop: "1px solid #666", margin: "15px 0" }} />

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
              Cannot delete selected {getSelectionTypeName(selection.type)}.
              Please select a group or building.
            </p>
          )}
      </div>

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
