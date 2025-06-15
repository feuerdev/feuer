import UnitInfo from "@/components/UnitInfo";
import TileInfo from "@/components/TileInfo";
import BuildingInfo from "@/components/BuildingInfo";
import { getTileById } from "@shared/objectutil";
import { SelectionType } from "@shared/objects";
import { useStore } from "@/lib/state";
import BattleInfo from "./BattleInfo";

const Hud = () => {
  const world = useStore((state) => state.world);
  const selection = useStore((state) => state.selection);
  const engine = useStore((state) => state.engine);
  const { type, id } = selection;

  if (!engine) {
    return null;
  }

  return (
    <div
      className="[&>*]:pointer-events-auto pointer-events-none absolute inset-0 h-screen w-screen text-white"
      id="hud"
    >
      {/* Battle Info Panel - shows if a battle is active */}
      {type === SelectionType.Battle &&
        id !== undefined &&
        world.battles.find((b) => b.id === id) && (
          <BattleInfo battle={world.battles.find((b) => b.id === id)} />
        )}

      {/* Bottom info panel */}
      <div
        id="bottom-panel"
        className="absolute bottom-0 left-0 right-0 z-10 h-[30%] bg-slate-900 bg-opacity-90 overflow-hidden"
      >
        {/* Show different info based on selection type */}
        {type === SelectionType.Unit && <UnitInfo unit={world.units[id!]} />}
        {type === SelectionType.Building && (
          <BuildingInfo building={world.buildings[id!]} />
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
