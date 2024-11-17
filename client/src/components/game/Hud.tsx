"use client";

import GroupInfo from "./GroupInfo";
import TileInfo from "./TileInfo";
import { getTileById } from "@shared/objectutil";
import { selection, SelectionType, uid, world } from "@/lib/game/game";
import Link from "next/link";

const Hud = () => {
  const { type, id } = selection;

  return (
    <div
      className="[&>*]:pointer-events-auto pointer-events-none absolute inset-0 h-screen w-screen text-white"
      id="hud"
    >
      <div>Hello {uid}! You&apos;re in game! This is the dev branch btw</div>
      <Link href="/logout">Logout</Link>

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
