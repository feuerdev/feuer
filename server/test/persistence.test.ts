import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prepareWorld, createSaveQueue } from "../src/world-state.js";
import { create } from "../src/world.js";
import { createUnit } from "../src/unit.js";
import { create as hex } from "../../shared/hex.js";
import { generateWorld } from "../src/mapgen.js";

test("seeded generation is isolated from process startup and assigns deterministic unique tile IDs",()=>{
  const a=generateWorld("fixture",2,0.1,1,-1,1,2,0.5);const b=generateWorld("fixture",2,0.1,1,-1,1,2,0.5);
  assert.deepEqual(a,b);assert.equal(a.idCounter, Object.keys(a.tiles).length-1);
});
test("JSON snapshot reload reconnects battles to authoritative unit objects",()=>{
  const world=create({});const a=createUnit(0,"alice",hex(0,0));const b=createUnit(1,"bob",hex(0,0));world.units={0:a,1:b};
  world.battles=[{id:2,attacker:a,defender:b,position:hex(0,0)}];const loaded=prepareWorld(JSON.parse(JSON.stringify(world)));
  assert.equal(loaded.battles[0].attacker,loaded.units[0]);assert.equal(loaded.battles[0].defender,loaded.units[1]);assert.equal(loaded.idCounter,2);
  const broken=JSON.parse(JSON.stringify(world));broken.units[1].id=0;assert.throws(()=>prepareWorld(broken),/duplicate/);
});
test("serial saves capture call-time state and survive reload through real files",async()=>{
  const folder=await mkdtemp(path.join(os.tmpdir(),"feuer-snapshot-")); const file=path.join(folder,"world.json");
  let release:()=>void;let writes=0;const first=new Promise<void>(resolve=>{release=resolve;});
  const queue=createSaveQueue(async world=>{if(++writes===1) await first;await writeFile(file,JSON.stringify(world));return true;});
  try {
    const world=create({});world.players.alice={uid:"alice",initialized:true,visibleHexes:[],discoveredHexes:[]};
    const a=queue(world);world.units[0]=createUnit(0,"alice",hex(0,0));const b=queue(world);world.units[0].name="later live change";
    await Promise.resolve();assert.equal(writes,1);release!();await a;await b;
    const loaded=prepareWorld(JSON.parse(await readFile(file,"utf8")));assert.equal(loaded.units[0].name,"Unit 0");assert.equal(loaded.units[0].owner,"alice");assert.equal(loaded.players.alice.uid,"alice");assert.equal(writes,2);
  } finally { release!();await rm(folder,{recursive:true,force:true}); }
});
test("save failure rejects its caller and a later save can recover",async()=>{
  let writes=0;const queue=createSaveQueue(async()=>++writes>1);const world=create({});
  await assert.rejects(queue(world),/save failed/);await queue(world);assert.equal(writes,2);
});
