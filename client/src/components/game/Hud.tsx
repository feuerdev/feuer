"use client";

import GroupInfo from "@/components/game/GroupInfo";
import TileInfo from "@/components/game/TileInfo";
import { getTileById } from "@shared/objectutil";
import { useGameStateContext } from "@/lib/GameStateProvider";
import { SelectionType } from "@/lib/types";

const Hud = () => {
  const { selection, world } = useGameStateContext();
  const { type, id } = selection;

  return (
    <div
      className="[&>*]:pointer-events-auto pointer-events-none absolute inset-0 h-screen w-screen text-white"
      id="hud"
    >
      <div
        id="bottom-bar"
        className="w-full h-1/5 bg-slate-900 fixed bottom-0 overflow-y-scroll "
      >
        {type == SelectionType.Group && <GroupInfo group={world.groups[id!]} />}
        {type == SelectionType.Tile && (
          <TileInfo tile={getTileById(id!, world.tiles)!} />
        )}
      </div>
    </div>
  );
};

export default Hud;
