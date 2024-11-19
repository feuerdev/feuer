"use client";

import { Group } from "@shared/objects";
import { getTileByPos } from "@shared/objectutil";
import ResourceInfo from "./ResourceInfo";
import socket from "@/lib/socket";
import { uid, world } from "@/lib/game";

const GroupInfo = ({ group }: { group: Group }) => {
  if (!group) {
    return <div>No group selected</div>;
  }

  const tile = getTileByPos(group.pos, world.tiles);

  if (!tile) {
    return <div>Group is not on a tile?</div>;
  }

  return (
    <div>
      <div className="flex items-start place-content-start gap-1 flex-row p-2">
        <div className="grid auto-cols-min gap-1 border p-2">
          {/* General Info */}
          <h2 className="col-span-2 text-xl">Group</h2>
          <div>Owner</div>
          <div>{group.owner == uid ? "You" : "Other Player"}</div>
          <div>Position</div>
          <div>
            {group.pos.q}:{group.pos.r}
          </div>
          <div>Status</div>
          <div>
            {group.targetHexes?.length > 0
              ? `Moving (${group.movementStatus.toFixed()} %)`
              : "Waiting"}
          </div>
          <div>Spotting</div>
          <div>{group.spotting}</div>
          <div>Units</div>
          <div>{group.units.length}</div>
        </div>
        {/* Units Info */}
        <div className="grid auto-cols-min gap-1 border p-2">
          <h2 className="col-span-2 text-xl">Units</h2>
          {group.units.map((unit) => {
            return [
              <div key={unit.id}>
                <div>Owner</div>,<div>{unit.owner}</div>,<div>Leadership</div>,
                <div>{unit.leadership}</div>,
                <button
                  onClick={() =>
                    socket.emit("request unit remove", {
                      groupId: group.id,
                      unitId: unit.id,
                    })
                  }
                >
                  Remove
                </button>
              </div>,
            ];
          })}
        </div>
        {/* Resources Info */}
        <ResourceInfo group={group} tile={tile} />
      </div>
    </div>
  );
};

export default GroupInfo;
