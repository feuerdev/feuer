import GroupInfo from "@/components/GroupInfo";
import TileInfo from "@/components/TileInfo";
import BuildingInfo from "@/components/BuildingInfo";
import { getTileById } from "@shared/objectutil";
import { SelectionType } from "@/lib/types";
import { useStore } from "@/lib/state";
import { Engine } from "@/lib/engine";

interface HudProps {
  engine: Engine;
}

const Hud = ({ engine }: HudProps) => {
  const world = useStore((state) => state.world);
  const selection = useStore((state) => state.selection);
  const { type, id } = selection;

  return (
    <div
      className="[&>*]:pointer-events-auto pointer-events-none absolute inset-0 h-screen w-screen text-white"
      id="hud"
    >
      {/* Bottom info panel */}
      <div
        id="bottom-panel"
        className="absolute bottom-0 left-0 right-0 z-10 h-[30%] bg-slate-900 bg-opacity-90 overflow-hidden"
      >
        {/* Show different info based on selection type */}
        {type === SelectionType.Group && (
          <GroupInfo group={world.groups[id!]} engine={engine} />
        )}
        {type === SelectionType.Building && (
          <BuildingInfo building={world.buildings[id!]} engine={engine} />
        )}
        {type === SelectionType.Tile && (
          <TileInfo tile={getTileById(id!, world.tiles)!} />
        )}
        {type === SelectionType.None && (
          <div className="p-2 text-center text-gray-400 text-sm">
            <p>No selection. Click on a tile or unit to view details.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Hud;
