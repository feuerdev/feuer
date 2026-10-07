import assert from "node:assert/strict";
import test from "node:test";
import GameServer from "../src/gameserver.js";
import { createBuilding } from "../src/building.js";
import { createUnit } from "../src/unit.js";
import { Biome, SelectionType, UnitBehavior, World } from "../../shared/objects.js";
import { create, hash } from "../../shared/hex.js";
import { prepareWorld } from "../src/world-state.js";

function fixture() {
  const pos = create(0, 0);
  const world: World = { idCounter: -1, players: {}, tiles: {}, buildings: {}, units: {}, battles: [], playerRelations: {} };
  world.tiles[hash(pos)] = { id: 20, hex: pos, biome: Biome.Grassland, height: 0.4, precipitation: 0.5, temperature: 15, resources: {wood:100,stone:100,berries:100} };
  const listeners = new Map<string, Function>(); const messages: any[] = [];
  const socket: any = { id: "a", connected: true, on(name, callback) { listeners.set(name, callback); }, emit(...args) { messages.push(args); }, removeAllListeners() { listeners.clear(); }, disconnect() { this.connected = false; listeners.get("disconnect")?.(); } };
  world.units[21] = createUnit(21, "alice", pos); world.buildings[22] = createBuilding(22, "alice", "campsite", pos);
  const game = new GameServer(world);
  world.players.alice = {uid:"alice",initialized:true,visibleHexes:[pos],discoveredHexes:[pos]};
  (game as any).socketplayer.a = world.players.alice; (game as any).uidsockets.alice = socket;
  return {game,world,socket,messages,pos};
}

test("loaded world allocates IDs above persisted entities and tiles", async () => {
  const {world,socket} = fixture(); const game = new GameServer(world);
  await game.onPlayerInitialize({...socket,id:"new"},"bob");
  const ids = [...Object.values(world.tiles),...Object.values(world.units),...Object.values(world.buildings)].map(x=>x.id);
  assert.equal(new Set(ids).size, ids.length); assert.ok(world.idCounter > 22);
});
test("building slots belong to each building, never shared templates", () => {
  const {pos} = fixture(); const first=createBuilding(1,"alice","campsite",pos);const second=createBuilding(2,"bob","campsite",pos);
  first.slots[0].assignedUnitId=90; assert.equal(second.slots[0].assignedUnitId,undefined);
});
test("unknown and malformed mutation payloads leave the world unchanged", () => {
  const {game,world,socket}=fixture();const before=JSON.stringify(world);
  for (const method of ["onRequestMovement","onRequestConstruction","onRequestTransfer","onRequestDisband","onRequestDemolish","onRequestAssignUnit","onRequestUnassignUnit","onRequestUpgradeBuilding","onRequestHireUnit","onRequestSetUnitBehavior","onRequestRelation","onRequestChangeRelation"]) {
    for (const input of [null,{},[],"bad"]) assert.doesNotThrow(()=>(game as any)[method](socket,input),method);
  }
  assert.equal(JSON.stringify(world),before);
});
test("non-finite or unknown resources cannot corrupt balances",()=>{
  const {game,world,socket}=fixture();const before=JSON.stringify(world);
  for(const data of [{unitId:21,resource:"wood",amount:NaN},{unitId:21,resource:"wood",amount:Infinity},{unitId:21,resource:"__proto__",amount:1},{unitId:999,resource:"wood",amount:1}]) assert.doesNotThrow(()=>game.onRequestTransfer(socket,data));
  assert.equal(JSON.stringify(world),before);
});
test("foreign ownership cannot move or disband a unit",()=>{
  const {game,world,socket,pos}=fixture();world.units[21].owner="bob";const before=JSON.stringify(world);
  game.onRequestMovement(socket,{selection:21,target:pos}); game.onRequestDisband(socket,{unitId:21});
  assert.equal(JSON.stringify(world),before);
});
test("tile requests cannot reveal undiscovered terrain",()=>{
  const {game,world,socket,messages}=fixture();const hidden=create(10,0);
  world.tiles[hash(hidden)]={...world.tiles[hash(create(0,0))],id:99,hex:hidden};
  game.onRequestTiles(socket,[hidden]);assert.deepEqual(messages.at(-1),["gamestate tiles",{}]);
});
test("disconnect removes command authority and reconnect does not duplicate entities",async()=>{
  const {game,world,socket,pos}=fixture();game.onPlayerDisconnected(socket);
  const before=JSON.stringify(world);game.onRequestDisband(socket,{unitId:21});assert.equal(JSON.stringify(world),before);
  const next={...socket,id:"b",connected:true};await game.onPlayerInitialize(next,"alice");
  assert.equal(Object.keys(world.units).length,1);assert.equal(Object.keys(world.buildings).length,1);
  assert.deepEqual(world.units[21].pos,pos);
});


test("the client's hire and signed transfer commands preserve costs and balances",()=>{
  const {game,world,socket}=fixture();
  game.onRequestHireUnit(socket,{buildingId:22,unitType:"Unit"});
  assert.equal(Object.keys(world.units).length,2);
  const tile=Object.values(world.tiles)[0]; assert.equal(tile.resources.berries,85);assert.equal(tile.resources.wood,95);
  game.onRequestTransfer(socket,{unitId:21,resource:"wood",amount:-5});
  assert.equal(tile.resources.wood,90);assert.equal(world.units[21].resources.wood,5);
  game.onRequestTransfer(socket,{unitId:21,resource:"wood",amount:5});
  assert.equal(tile.resources.wood,95);assert.equal(world.units[21].resources.wood,0);
});
test("replaced sockets cannot mutate the resumed settlement",async()=>{
  const {game,world,socket}=fixture();const next={...socket,id:"b",connected:true};
  await game.onPlayerInitialize(next,"alice");
  const before=JSON.stringify(world);game.onRequestDisband(socket,{unitId:21});assert.equal(JSON.stringify(world),before);
  assert.equal(socket.connected,false);
});

for (const removal of ["disband", "debug deletion", "combat defeat"] as const) {
  test(`${removal} removes every affected battle before snapshot reload`, () => {
    const {game,world,socket,pos}=fixture();
    for (const [id,owner] of [[23,"bob"],[24,"carol"],[25,"dan"],[26,"eve"]] as const) {
      world.units[id]=createUnit(id,owner,pos);
      world.units[id].behavior=UnitBehavior.FleeIfAttacked;
      world.players[owner]={uid:owner,initialized:true,visibleHexes:[pos],discoveredHexes:[pos]};
    }
    world.idCounter=29;
    world.battles=[
      {id:27,attacker:world.units[21],defender:world.units[23],position:pos},
      {id:28,attacker:world.units[25],defender:world.units[26],position:pos},
      {id:29,attacker:world.units[24],defender:world.units[21],position:pos},
    ];
    const bobMorale=world.units[23].morale;
    if (removal === "disband") game.onRequestDisband(socket,{unitId:21});
    else if (removal === "debug deletion") (game as any).handleDebugKillEntity(socket,{type:SelectionType.Unit,id:21});
    else {
      world.units[21].morale=0;
      assert.doesNotThrow(()=>game.update(1));
    }
    assert.equal(world.units[21],undefined);
    assert.equal(world.units[23].morale,bobMorale,"The removed unit must not continue its other battle");
    const loaded=prepareWorld(JSON.parse(JSON.stringify(world)));
    assert.deepEqual(loaded.battles.map(battle=>battle.id),[28]);
    assert.equal(loaded.battles[0].attacker,loaded.units[25]);
    assert.equal(loaded.battles[0].defender,loaded.units[26]);
  });
}
