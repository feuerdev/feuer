import { Button } from "../ui/Button";
import { InfoBox } from "./InfoBox";
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

export function ControlPanel() {
  const { selection, zoomIn, zoomOut, resetZoom, centerViewport } =
    useGameStateContext();
  const { type, id } = selection;

  return (
    <div className="w-full flex justify-between items-center p-2 bg-slate-900 bg-opacity-80">
      <div className="flex space-x-2">
        <Button onClick={zoomIn} size="sm" leftIcon={<PlusIcon />}>
          Zoom
        </Button>
        <Button onClick={zoomOut} size="sm" leftIcon={<MinusIcon />}>
          Zoom
        </Button>
        <Button onClick={resetZoom} size="sm" variant="secondary">
          Reset
        </Button>
        <Button
          onClick={() => centerViewport()}
          size="sm"
          variant="secondary"
          leftIcon={<CenterIcon />}
        >
          Center
        </Button>
      </div>

      {selection.id && (
        <InfoBox
          title={`Selected: ${getSelectionTypeName(type)}`}
          className="min-w-[200px]"
        >
          <p className="text-center text-gray-200">ID: {id}</p>
        </InfoBox>
      )}
    </div>
  );
}

// Simple SVG icons
function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}

function CenterIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <circle cx="12" cy="12" r="2"></circle>
    </svg>
  );
}
