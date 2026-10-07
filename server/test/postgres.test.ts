import assert from "node:assert/strict";
import test from "node:test";
import { createUnit } from "../src/unit.js";
import { create as hex } from "../../shared/hex.js";
import { prepareWorld } from "../src/world-state.js";

const url=process.env.FEUER_DB_CONNECTION_STRING;
test("real PostgreSQL retains ownership/resources and IDs across snapshot reload", {skip:!url},async()=>{
  const target=new URL(url!);
  if (!["localhost","127.0.0.1"].includes(target.hostname) || target.pathname!=="/feuer_test") throw new Error("Only an isolated loopback feuer_test database may be used.");
  const {initDatabase,saveWorldToDb,loadWorldFromDb,closeDatabase}=await import("../src/db.js");
  const world={idCounter:0,players:{alice:{uid:"alice",initialized:true,visibleHexes:[],discoveredHexes:[]}},tiles:{},units:{0:createUnit(0,"alice",hex(0,0),{wood:27})},buildings:{},battles:[],playerRelations:{}};
  const name=`test-${crypto.randomUUID()}`;
  try {
    assert.equal(await initDatabase(),true);assert.equal(await saveWorldToDb(world,name),true);
    const loaded=prepareWorld((await loadWorldFromDb(name))!);
    assert.equal(loaded.units[0].resources.wood,27);assert.equal(loaded.units[0].owner,"alice");assert.equal(loaded.idCounter,0);
    assert.equal(await loadWorldFromDb(`${name}-absent`),null);
  } finally {await closeDatabase();}
});
