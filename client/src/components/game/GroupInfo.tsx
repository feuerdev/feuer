"use client";

import { Group } from "@shared/objects";
import { getTileByPos } from "@shared/objectutil";
import ResourceInfo from "./ResourceInfo";
import { useGameStateContext } from "@/lib/GameStateProvider";
import { InfoBox, InfoRow, InfoDivider } from "../ui/InfoBox";
import { Button } from "../ui/button";
import { useSocket } from "@/components/hooks/useSocket";

const GroupInfo = ({ group }: { group: Group }) => {
  const { world, uid } = useGameStateContext();
  const { socket } = useSocket();

  if (!group) {
    return <div>No group selected</div>;
  }

  const tile = getTileByPos(group.pos, world.tiles);

  if (!tile) {
    return <div>Group is not on a tile?</div>;
  }

  return (
    <div className="flex flex-wrap gap-4 p-4">
      <InfoBox title="Group Details" className="flex-1 min-w-[250px]">
        <InfoRow
          label="Owner"
          value={group.owner === uid ? "You" : "Other Player"}
        />
        <InfoRow label="Position" value={`${group.pos.q}:${group.pos.r}`} />
        <InfoRow
          label="Status"
          value={
            group.targetHexes?.length > 0
              ? `Moving (${group.movementStatus.toFixed()} %)`
              : "Waiting"
          }
        />
        <InfoRow label="Spotting" value={group.spotting} />
        <InfoRow label="Units" value={group.units.length} />
      </InfoBox>

      <InfoBox title="Units" className="flex-1 min-w-[300px]">
        {group.units.length === 0 ? (
          <p className="text-gray-400 italic">No units in this group</p>
        ) : (
          group.units.map((unit, index) => (
            <div key={unit.id} className="mb-2">
              {index > 0 && <InfoDivider />}
              <InfoRow label="ID" value={unit.id} />
              <InfoRow label="Owner" value={unit.owner} />
              <InfoRow label="Leadership" value={unit.leadership} />
              <div className="mt-2">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() =>
                    socket.emit("request unit remove", {
                      groupId: group.id,
                      unitId: unit.id,
                    })
                  }
                >
                  Remove Unit
                </Button>
              </div>
            </div>
          ))
        )}
      </InfoBox>

      <div className="w-full">
        <ResourceInfo group={group} tile={tile} />
      </div>
    </div>
  );
};

export default GroupInfo;
