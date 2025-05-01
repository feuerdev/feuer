import GroupInfo from "@/components/GroupInfo";
import TileInfo from "@/components/TileInfo";
import { getTileById } from "@shared/objectutil";
import { SelectionType } from "@/lib/types";

const Hud = () => {
  const { selection, world } = useGameStateContext();
  const { type, id } = selection;

  return (
    <div
      className="[&>*]:pointer-events-auto pointer-events-none absolute inset-0 h-screen w-screen text-white"
      id="hud"
    >
      {/* Bottom info panel */}
      <div
        id="bottom-panel"
        className="absolute bottom-0 left-0 right-0 z-10 h-1/4 bg-slate-900 bg-opacity-90 overflow-y-auto"
      >
        {/* Show different info based on selection type */}
        {type === SelectionType.Group && (
          <GroupInfo group={world.groups[id!]} />
        )}
        {type === SelectionType.Tile && (
          <TileInfo tile={getTileById(id!, world.tiles)!} />
        )}
        {type === SelectionType.None && (
          <div className="p-4 text-center text-gray-400">
            <p>No selection. Click on a tile or unit to view details.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Hud;
