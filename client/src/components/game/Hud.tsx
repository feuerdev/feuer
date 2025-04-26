"use client";

import GroupInfo from "@/components/game/GroupInfo";
import TileInfo from "@/components/game/TileInfo";
import { getTileById } from "@shared/objectutil";
import { useGameStateContext } from "@/lib/GameStateProvider";
import { SelectionType } from "@/lib/types";

// Helper for displaying selection type names
const getSelectionTypeName = (type: SelectionType): string => {
  switch (type) {
    case SelectionType.None:
      return "None";
    case SelectionType.Group:
      return "Group";
    case SelectionType.Tile:
      return "Tile";
    case SelectionType.Building:
      return "Building";
    default:
      return "Unknown";
  }
};

const Hud = () => {
  const { selection, world, zoomIn, zoomOut, resetZoom, centerViewport } =
    useGameStateContext();
  const { type, id } = selection;

  return (
    <div
      className="[&>*]:pointer-events-auto pointer-events-none absolute inset-0 h-screen w-screen text-white"
      id="hud"
    >
      {/* Top bar with controls */}
      <div
        id="top-bar"
        className="w-full flex justify-between items-center p-2 bg-slate-900 bg-opacity-80"
      >
        <div className="flex gap-2">
          <button
            onClick={zoomIn}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
          >
            Zoom In
          </button>
          <button
            onClick={zoomOut}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
          >
            Zoom Out
          </button>
          <button
            onClick={resetZoom}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
          >
            Reset Zoom
          </button>
          <button
            onClick={() => centerViewport()}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
          >
            Center View
          </button>
        </div>
        <div>
          {selection.id && (
            <div className="text-right">
              Selected: {getSelectionTypeName(type)} {id}
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar with information */}
      <div
        id="bottom-bar"
        className="w-full h-1/5 bg-slate-900 fixed bottom-0 overflow-y-scroll"
      >
        {type === SelectionType.Group && (
          <GroupInfo group={world.groups[id!]} />
        )}
        {type === SelectionType.Tile && (
          <TileInfo tile={getTileById(id!, world.tiles)!} />
        )}
      </div>
    </div>
  );
};

export default Hud;
