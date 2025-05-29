import { Group } from "@shared/objects";
import { getTileByPos } from "@shared/objectutil";
import ResourceInfo from "./ResourceInfo";
import { InfoBox, InfoRow, InfoDivider } from "./InfoBox";
import { Button } from "./ui/Button";
import { useStore } from "@/lib/state";
import InjuriesInfo from "./InjuriesInfo";
import { GroupBehavior } from "@shared/objects";

const GroupInfo = ({ group }: { group: Group }) => {
  const world = useStore((state) => state.world);
  const engine = useStore((state) => state.engine);

  if (!group) {
    return <div>No group selected</div>;
  }

  const tile = getTileByPos(group.pos, world.tiles);

  if (!tile) {
    return <div>Group is not on a tile?</div>;
  }

  // Get assigned building info if applicable
  const assignedBuilding =
    group.assignedToBuilding !== undefined
      ? world.buildings[group.assignedToBuilding]
      : undefined;

  const assignedSlot =
    assignedBuilding && group.assignedToSlot !== undefined
      ? assignedBuilding.slots[group.assignedToSlot]
      : undefined;

  return (
    <div className="inline-grid grid-cols-[minmax(250px,auto)_auto_auto] gap-2 p-2 h-full">
      <InfoBox title="Group Details" className="h-full overflow-y-auto">
        <InfoRow label="Name" value={group.name} />
        <InfoRow label="Position" value={`${group.pos.q}:${group.pos.r}`} />
        <InfoRow
          label="Status"
          value={
            group.targetHexes?.length > 0
              ? `Moving (${group.movementStatus.toFixed(0)} %)`
              : assignedBuilding
              ? `Working at ${assignedBuilding.key}`
              : "Waiting"
          }
        />
        <InfoRow label="Spotting" value={group.spotting} />
        <InfoRow label="Morale" value={`${group.morale}%`} />

        <InfoDivider />
        <div>
          <label
            htmlFor={`behavior-select-${group.id}`}
            className="block text-xs font-medium text-slate-400 mb-1"
          >
            Behavior:
          </label>
          <select
            id={`behavior-select-${group.id}`}
            value={group.behavior}
            onChange={(e) => {
              const newBehavior = parseInt(e.target.value) as GroupBehavior;
              // TODO: Send update to server: engine.requestSetGroupBehavior(group.id, newBehavior);
              console.log(
                `Group ${group.id} behavior changed to: ${GroupBehavior[newBehavior]}`
              );
              // Optimistically update client state, server will send authoritative update
              useStore.getState().setWorld({
                ...world,
                groups: {
                  ...world.groups,
                  [group.id]: { ...group, behavior: newBehavior },
                },
              });
            }}
            className="block w-full rounded-md border-slate-600 bg-slate-700 py-1.5 text-slate-200 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-xs"
          >
            {Object.values(GroupBehavior)
              .filter((value) => typeof value === "number")
              .map((value) => (
                <option key={value as number} value={value as number}>
                  {GroupBehavior[value as number]}
                </option>
              ))}
          </select>
        </div>

        {assignedBuilding && assignedSlot && (
          <>
            <InfoDivider />
            <div className="mt-2">
              <h3 className="text-sm font-semibold mb-1">Assignment</h3>
              <InfoRow label="Building" value={assignedBuilding.key} />
              <InfoRow
                label="Slot"
                value={`${assignedSlot.resourceType} (${(
                  assignedSlot.efficiency * 100
                ).toFixed(0)}%)`}
              />
              <div className="mt-2">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => engine.requestGroupUnassignment(group.id)}
                >
                  Unassign from Building
                </Button>
              </div>
            </div>
          </>
        )}

        <InfoDivider />
        <div className="mt-2">
          <h3 className="text-sm font-semibold mb-1">Gathering Efficiency</h3>
          <InfoRow
            label="Wood"
            value={`${(group.gatheringEfficiency.wood * 100).toFixed(0)}%`}
          />
          <InfoRow
            label="Stone"
            value={`${(group.gatheringEfficiency.stone * 100).toFixed(0)}%`}
          />
          <InfoRow
            label="Food"
            value={`${(group.gatheringEfficiency.food * 100).toFixed(0)}%`}
          />
          <InfoRow
            label="Iron"
            value={`${(group.gatheringEfficiency.iron * 100).toFixed(0)}%`}
          />
          <InfoRow
            label="Gold"
            value={`${(group.gatheringEfficiency.gold * 100).toFixed(0)}%`}
          />
        </div>
      </InfoBox>

      <InfoBox title="Stats" className="h-full overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">Combat Stats</h3>
            <InfoRow label="Attack" value={Math.floor(group.attack)} />
            <InfoRow label="Defense" value={Math.floor(group.defense)} />
            <InfoRow label="Morale" value={`${group.morale.toFixed(1)}%`} />
            <InfoRow label="Initiative" value={group.initiative} />
            <InfoRow label="Agility" value={group.agility} />
            <InfoRow label="Intelligence" value={group.intelligence} />
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Physical Stats</h3>
            <InfoRow label="Strength" value={Math.floor(group.strength)} />
            <InfoRow label="Endurance" value={Math.floor(group.endurance)} />
            <InfoRow label="Pain Thresh." value={group.painThreshold} />
          </div>
        </div>
        <InjuriesInfo injuries={group.injuries} />
      </InfoBox>

      <ResourceInfo group={group} tile={tile} className="h-full" />
    </div>
  );
};

export default GroupInfo;
