import type { World } from "../../shared/objects.js";

// Reconcile persisted counters and battle references before accepting commands.
export function prepareWorld(world: World): World {
  if (!world || ![world.tiles,world.units,world.buildings,world.players,world.playerRelations].every(x=>x && typeof x === "object" && !Array.isArray(x)) || !Array.isArray(world.battles)) throw new Error("Invalid world snapshot.");
  let maximum = Number.isSafeInteger(world.idCounter) && world.idCounter >= -1 ? world.idCounter : -1;
  const seen = new Set<number>();
  for (const entity of [...Object.values(world.tiles),...Object.values(world.units),...Object.values(world.buildings),...world.battles]) {
    if (!Number.isSafeInteger(entity.id) || entity.id < 0 || seen.has(entity.id)) throw new Error("Invalid or duplicate entity ID in world snapshot.");
    seen.add(entity.id); maximum=Math.max(maximum,entity.id);
  }
  if(maximum >= Number.MAX_SAFE_INTEGER) throw new Error("World entity IDs exhausted.");
  world.idCounter=maximum;
  for(const battle of world.battles) {
    const attacker=world.units[battle.attacker?.id], defender=world.units[battle.defender?.id];
    if(!attacker || !defender || attacker.id === defender.id) throw new Error("Invalid battle reference in world snapshot.");
    battle.attacker=attacker; battle.defender=defender;
  }
  return world;
}

export function createSaveQueue(save: (world: World) => Promise<boolean>) {
  let tail: Promise<void> = Promise.resolve();
  return (world: World): Promise<void> => {
    const snapshot=structuredClone(world);
    const next=tail.then(async()=> { if(!await save(snapshot)) throw new Error("World snapshot save failed."); });
    tail=next.catch(()=>{}); // Failure is returned to its caller; later saves may recover.
    return next;
  };
}
