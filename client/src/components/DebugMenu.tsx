import React, { useState, useEffect, useCallback } from "react";
import { useStore } from "@/lib/state";
import { SelectionType, getSelectionTypeName } from "@shared/objects";
import { Resources, create as createResources } from "@shared/resources";
import BuildingsJson from "@shared/templates/buildings.json";

const resourceKeys = Object.keys(createResources()) as Array<keyof Resources>;

type ResourceKeyType = keyof Resources;

const buildingTemplateKeys = Object.keys(BuildingsJson);
interface BuildingTemplateData {
  name: string;
  key: string;
}

// Cast BuildingsJson to a more specific type to avoid general 'any'
const typedBuildingsJson = BuildingsJson as Record<
  string,
  { name?: string; key: string }
>;

const buildingTemplates: BuildingTemplateData[] = buildingTemplateKeys.map(
  (key) => ({
    key: key,
    name:
      typedBuildingsJson[key]?.name ||
      key.charAt(0).toUpperCase() + key.slice(1),
  })
);

const DebugMenu: React.FC = () => {
  const isDevelopment = process.env.NODE_ENV === "development";
  const [isVisible, setIsVisible] = useState(isDevelopment);
  const [selectedResource, setSelectedResource] = useState<ResourceKeyType>(
    resourceKeys[0] || "wood"
  );
  const [resourceAmount, setResourceAmount] = useState<number>(100);
  const [selectedBuildingKey, setSelectedBuildingKey] = useState<string>(
    buildingTemplates[0]?.key || ""
  );

  const selection = useStore((state) => state.selection);
  const socket = useStore((state) => state.socket);
  const world = useStore((state) => state.world);

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
    if (
      !socket ||
      !selection ||
      selection.id === undefined ||
      (selection.type !== SelectionType.Tile &&
        selection.type !== SelectionType.Unit)
    ) {
      console.warn(
        "DebugMenu: No target selected for adding resources or socket not available."
      );
      return;
    }
    if (
      selection.type !== SelectionType.Tile &&
      selection.type !== SelectionType.Unit
    ) {
      console.warn(
        "DebugMenu: Resources can only be added to Tiles or Units."
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
    if (
      !socket ||
      !selection ||
      selection.id === undefined ||
      (selection.type !== SelectionType.Tile &&
        selection.type !== SelectionType.Unit)
    ) {
      console.warn(
        "DebugMenu: No target selected for adding all resources or socket not available."
      );
      return;
    }
    if (
      selection.type !== SelectionType.Tile &&
      selection.type !== SelectionType.Unit
    ) {
      console.warn(
        "DebugMenu: Resources can only be added to Tiles or Units."
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

  const handleSpawnBuilding = () => {
    if (
      !socket ||
      !selection ||
      selection.id === undefined ||
      selection.type !== SelectionType.Tile
    ) {
      console.warn(
        "DebugMenu: No tile selected for spawning building or socket not available."
      );
      return;
    }
    if (!selectedBuildingKey) {
      console.warn("DebugMenu: No building type selected.");
      return;
    }
    const selectedTile = Object.values(world.tiles).find(
      (tile) => tile.id === selection.id
    );
    if (!selectedTile) {
      console.warn("DebugMenu: Selected tile data not found in world state.");
      return;
    }

    console.log(
      `DebugMenu: Spawning building ${selectedBuildingKey} on tile ID ${selection.id}`
    );
    socket.emit("debug:spawnBuilding", {
      buildingKey: selectedBuildingKey,
      position: selectedTile.hex,
    });
  };

  const handleSpawnUnit = () => {
    if (
      !socket ||
      !selection ||
      selection.id === undefined ||
      selection.type !== SelectionType.Tile
    ) {
      console.warn(
        "DebugMenu: No tile selected for spawning unit or socket not available."
      );
      return;
    }
    const selectedTile = Object.values(world.tiles).find(
      (tile) => tile.id === selection.id
    );
    if (!selectedTile) {
      console.warn(
        "DebugMenu: Selected tile data not found for spawning unit."
      );
      return;
    }
    console.log(`DebugMenu: Spawning generic unit on tile ID ${selection.id}`);
    socket.emit("debug:spawnUnit", { position: selectedTile.hex });
  };

  if (!isDevelopment || !isVisible) {
    return null;
  }

  // Derived state for conditional rendering and styling
  const hasSelection = selection && selection.id !== undefined;
  const isTileSelected = hasSelection && selection.type === SelectionType.Tile;
  const isUnitSelected = hasSelection && selection.type === SelectionType.Unit;
  const isTileOrUnitSelected = isTileSelected || isUnitSelected;

  const canDeleteSelected =
    hasSelection &&
    selection.type !== SelectionType.Tile &&
    selection.type !== SelectionType.None &&
    selection.type !== SelectionType.Battle;

  const getButtonClasses = (
    baseColor: string,
    hoverColor: string,
    disabled: boolean,
    textColor: string = "text-white"
  ) => {
    return `w-full px-3 py-2 rounded-md text-sm font-medium ${textColor} ${
      disabled
        ? "bg-gray-500 cursor-not-allowed"
        : `${baseColor} hover:${hoverColor} cursor-pointer`
    }`;
  };

  const selectionText = hasSelection
    ? `${getSelectionTypeName(selection.type)} ID: ${selection.id}`
    : "N/A";
  const tileSelectionText = isTileSelected ? `ID: ${selection.id}` : "N/A";

  return (
    <div className="absolute top-2.5 right-2.5 bg-gray-800 bg-opacity-90 text-white p-4 rounded-lg shadow-lg z-[1000] min-w-[350px] max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-2.5">
        <h3 className="text-lg font-semibold">Debug Menu</h3>
        <button
          onClick={toggleVisibility}
          className="bg-transparent border-none text-white text-2xl cursor-pointer"
        >
          &times;
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-0">
        Press Ctrl+M (or Cmd+M) to toggle.
      </p>

      <hr className="border-gray-600 my-4" />

      <div>
        <h4 className="text-base font-semibold mt-0 mb-2.5">Add Resources</h4>
        <div className="mb-2.5">
          <label htmlFor="resourceType" className="mr-1.5 text-sm">
            Resource:
          </label>
          <select
            id="resourceType"
            value={selectedResource}
            onChange={(e) =>
              setSelectedResource(e.target.value as ResourceKeyType)
            }
            className="p-1.5 rounded bg-gray-700 text-white border border-gray-600"
          >
            {resourceKeys.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-2.5">
          <label htmlFor="resourceAmount" className="mr-1.5 text-sm">
            Amount:
          </label>
          <input
            type="number"
            id="resourceAmount"
            value={resourceAmount}
            onChange={(e) => setResourceAmount(parseInt(e.target.value, 10))}
            min="1"
            className="p-1.5 rounded bg-gray-700 text-white border border-gray-600 w-20"
          />
        </div>
        <button
          onClick={handleAddSpecificResource}
          disabled={!isTileOrUnitSelected}
          className={`${getButtonClasses(
            "bg-green-600",
            "bg-green-700",
            !isTileOrUnitSelected
          )} mb-1.5`}
        >
          Add Specific to Selected ({selectionText})
        </button>
        <button
          onClick={handleAddAllResources}
          disabled={!isTileOrUnitSelected}
          className={getButtonClasses(
            "bg-sky-600",
            "bg-sky-700",
            !isTileOrUnitSelected
          )}
        >
          Add 1000 All to Selected ({selectionText})
        </button>
        <p
          className={`text-xs text-yellow-400 mt-1.5 ${
            hasSelection && !isTileOrUnitSelected ? "visible" : "invisible"
          }`}
        >
          Select a Tile or Unit to add resources.
        </p>
      </div>

      <hr className="border-gray-600 my-4" />

      <div>
        <h4 className="text-base font-semibold mt-0 mb-2.5">Spawn Building</h4>
        <div className="mb-2.5">
          <label htmlFor="buildingType" className="mr-1.5 text-sm">
            Building:
          </label>
          <select
            id="buildingType"
            value={selectedBuildingKey}
            onChange={(e) => setSelectedBuildingKey(e.target.value)}
            className="p-1.5 rounded bg-gray-700 text-white border border-gray-600 w-full"
          >
            {buildingTemplates.map((template) => (
              <option key={template.key} value={template.key}>
                {template.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleSpawnBuilding}
          disabled={!isTileSelected || !selectedBuildingKey}
          className={getButtonClasses(
            "bg-blue-600",
            "bg-blue-700",
            !isTileSelected || !selectedBuildingKey
          )}
        >
          Spawn Building on Selected Tile ({tileSelectionText})
        </button>
        <p
          className={`text-xs text-yellow-400 mt-1.5 ${
            hasSelection && !isTileSelected ? "visible" : "invisible"
          }`}
        >
          Select a Tile to spawn a building.
        </p>
      </div>

      <hr className="border-gray-600 my-4" />

      <div>
        <h4 className="text-base font-semibold mt-0 mb-2.5">Spawn Unit</h4>
        <button
          onClick={handleSpawnUnit}
          disabled={!isTileSelected}
          className={getButtonClasses(
            "bg-yellow-500",
            "bg-yellow-600",
            !isTileSelected,
            "text-black"
          )}
        >
          Spawn Generic Unit on Selected Tile ({tileSelectionText})
        </button>
        <p
          className={`text-xs text-yellow-400 mt-1.5 ${
            hasSelection && !isTileSelected ? "visible" : "invisible"
          }`}
        >
          Select a Tile to spawn a unit.
        </p>
      </div>

      <hr className="border-gray-600 my-4" />

      <div className="mt-4">
        <button
          onClick={handleDeleteSelectedEntity}
          disabled={!canDeleteSelected}
          className={getButtonClasses(
            "bg-red-600",
            "bg-red-700",
            !canDeleteSelected
          )}
        >
          Delete Selected Entity (ID: {hasSelection ? selection.id : "N/A"})
        </button>
        <p
          className={`text-xs text-yellow-400 mt-1.5 ${
            hasSelection &&
            !canDeleteSelected &&
            selection.type !== SelectionType.None
              ? "visible"
              : "invisible"
          }`}
        >
          {/* Ensure text is available even when invisible to maintain height, or use a placeholder like &nbsp; if preferred */}
          {hasSelection &&
          !canDeleteSelected &&
          selection.type !== SelectionType.None
            ? `Cannot delete selected ${getSelectionTypeName(
                selection.type
              )}. Please select a unit or building.`
            : "\u00A0"}
          {/* Using non-breaking space to maintain height */}
        </p>
      </div>
    </div>
  );
};

export default DebugMenu;
