import { readFile } from "node:fs/promises";

// Replace only storage. The child runs the real startup, sockets and signal handler.
export async function load(url, context, nextLoad) {
  if (url.endsWith("/server/src/db.ts")) {
    return {format:"module",shortCircuit:true,source:"export async function initDatabase(){return true;}"};
  }
  if (url.endsWith("/server/src/world.ts")) {
    const fixture=await readFile(process.env.FEUER_TEST_WORLD,"utf8");
    return {format:"module",shortCircuit:true,source:`
      const world=${fixture};
      export function create(tiles){return {idCounter:-1,players:{},tiles,units:{},buildings:{},battles:[],playerRelations:{}};}
      export async function listWorlds(){return ['fixture'];}
      export async function loadWorld(){return world;}
      export async function saveWorld(snapshot){
        process.send({type:'saving'});
        await new Promise(resolve=>process.once('message',resolve));
        process.send({type:'saved',snapshot,live:world});
        return true;
      }
    `};
  }
  return nextLoad(url,context);
}
