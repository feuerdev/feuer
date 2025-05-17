import { Group } from "@shared/objects";
import { getTileByPos } from "@shared/objectutil";
import ResourceInfo from "./ResourceInfo";
import { InfoBox, InfoRow, InfoDivider } from "./InfoBox";
import { Button } from "./ui/Button";
import { useStore } from "@/lib/state";

const GroupInfo = ({ group }: { group: Group }) => {
  const world = useStore((state) => state.world);
  const socket = useStore((state) => state.socket);

  if (!group) {
    return <div>No group selected</div>;
  }

  const tile = getTileByPos(group.pos, world.tiles);

  if (!tile) {
    return <div>Group is not on a tile?</div>;
  }

  return (
    <div className="flex flex-nowrap gap-2 p-2 overflow-x-auto">
      <InfoBox title="Group Details" className="w-60 shrink-0">
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

      <InfoBox title="Units" className="w-64 shrink-0">
        <div className="max-h-48 overflow-auto pr-1">
          {group.units.length === 0 ? (
            <p className="text-gray-400 italic text-xs">
              No units in this group
            </p>
          ) : (
            group.units.map((unit, index) => (
              <div key={unit.id} className="mb-1">
                {index > 0 && <InfoDivider />}
                <InfoRow label="ID" value={unit.id} />
                <InfoRow label="Owner" value={unit.owner} />
                <InfoRow label="Leadership" value={unit.leadership} />
                <div className="mt-1">
                  <Button
                    variant="danger"
                    size="xs"
                    onClick={() =>
                      socket?.emit("request unit remove", {
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
        </div>
      </InfoBox>

      <ResourceInfo group={group} tile={tile} className="w-80 shrink-0" />
    </div>
  );
};

export default GroupInfo;
