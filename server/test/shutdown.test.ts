import assert from "node:assert/strict";
import test from "node:test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import { io, Socket } from "socket.io-client";
import { createUnit } from "../src/unit.js";
import { Biome, Unit } from "../../shared/objects.js";
import { create, hash } from "../../shared/hex.js";

test("shutdown rejects reconnects while the final snapshot save is pending", {timeout:15000}, async () => {
  const folder=await mkdtemp(`${tmpdir()}/feuer-shutdown-`);
  const pos=create(0,0);
  const world={idCounter:21,players:{alice:{uid:"alice",initialized:true,visibleHexes:[pos],discoveredHexes:[pos]}},
    tiles:{[hash(pos)]:{id:20,hex:pos,biome:Biome.Grassland,height:.4,precipitation:.5,temperature:15,resources:{wood:100}}},
    units:{21:createUnit(21,"alice",pos)},buildings:{},battles:[],playerRelations:{}};
  await writeFile(`${folder}/world.json`,JSON.stringify(world));
  const listener=createServer();
  listener.listen(0,"127.0.0.1");
  await once(listener,"listening");
  const port=(listener.address() as import("node:net").AddressInfo).port;
  await new Promise<void>(resolve=>listener.close(()=>resolve()));
  const child=spawn(process.execPath,["--import",import.meta.resolve("tsx"),"--import",new URL("./fixtures/shutdown-register.mjs",import.meta.url).href,
    new URL("../src/main.ts",import.meta.url).pathname],{
    cwd:folder,env:{PATH:process.env.PATH,NODE_ENV:"development",FEUER_PORT:String(port),FEUER_HOST:"127.0.0.1",FEUER_CLIENT_URLS:"http://127.0.0.1",
      FEUER_WORLD_PERSISTENCE:"true",FEUER_DB_CONNECTION_STRING:"postgresql://fixture:inert@127.0.0.1/feuer_test",FEUER_TEST_WORLD:`${folder}/world.json`},
    stdio:["ignore","pipe","pipe","ipc"],
  });
  const exited=once(child,"exit");
  let output="";
  child.stdout.on("data",data=>output+=data);
  child.stderr.on("data",data=>output+=data);
  let client: Socket;
  try {
    const listening=new Promise<number>((resolve,reject)=>{
      child.stdout.on("data",()=>{const port=output.match(/Server listening on 127\.0\.0\.1:(\d+)/)?.[1];if(port)resolve(Number(port));});
      child.once("exit",()=>reject(new Error(output)));
    });
    assert.equal(await listening,port);
    client=io(`http://127.0.0.1:${port}`,{transports:["websocket"],auth:{user:"alice"},reconnection:false,timeout:1000});
    await new Promise<void>((resolve,reject)=>{
      client.once("connect",()=>resolve());
      client.once("connect_error",reject);
    });
    const unit=new Promise<Unit>(resolve=>client.once("gamestate unit",resolve));
    client.emit("request unit",21);
    assert.equal((await unit).id,21);
    client.disconnect();
    const saving=once(child,"message");
    child.kill("SIGTERM");
    assert.equal((await saving)[0].type,"saving");
    client=io(`http://127.0.0.1:${port}`,{transports:["websocket"],auth:{user:"alice"},reconnection:false,timeout:1000});
    const connected=await new Promise<boolean>(resolve=>{
      client.once("connect",()=>resolve(true));
      client.once("connect_error",()=>resolve(false));
    });
    assert.equal(connected,false,"A reconnect was admitted after the final snapshot was captured");
    const saved=once(child,"message");
    child.send("finish save");
    const result=(await saved)[0];
    assert.equal(result.type,"saved");
    assert.deepEqual(result.live,result.snapshot);
    assert.equal((await exited)[0],0,output);
  } finally {
    client?.disconnect();
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
      await exited;
    }
    await rm(folder,{recursive:true,force:true});
  }
});
