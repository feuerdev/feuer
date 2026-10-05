import { createServer } from "node:http";
import { createSaveQueue, prepareWorld } from "./world-state.js";
import { validUser } from "./commands.js";
import { Server } from "socket.io"
import { generateWorld } from "./mapgen.js"
import Rules from "../../shared/rules.json" with { type: "json" };
import GameServer from "./gameserver.js"
import Config from "./environment.js"
import { createClerkClient, User } from '@clerk/clerk-sdk-node';
import { listWorlds, loadWorld, saveWorld } from "./world.js";
import { initDatabase } from "./db.js";
import { World } from "../../shared/objects.js";

// Initialize and load or generate world
let world: World | null = null;
const enqueueSave = createSaveQueue(saveWorld);

const worldName = Config.worldName;
const worldPersistence = Config.worldPersistence && !!worldName;
console.info(`Using world name: "${worldName}"`);
console.info(`World persistence: ${worldPersistence}`);

if (worldPersistence && !Config.dbConnectionString) throw new Error("Persistent world requires database configuration; disable persistence explicitly for an isolated development fixture.");
if (!Number.isInteger(Config.port) || Config.port < 1 || Config.port > 65535 || !Number.isFinite(Config.updateRate) || Config.updateRate <= 0 || !Number.isFinite(Config.referenceRate) || Config.referenceRate <= 0) throw new Error("Invalid port or simulation rates.");
if (!Config.clientUrls) throw new Error("Client origin configuration is required.");
if (worldPersistence && Config.dbConnectionString) {
  if (!await initDatabase()) throw new Error("Persistent world database is unavailable.");
  // List available worlds
  const worlds = await listWorlds();
  if (worlds.length > 0) {
    console.info(`Available worlds: ${worlds.join(', ')}`);
  }
  // Try to load existing world with the specified name
  world = await loadWorld();
}

// If no world loaded, generate a new one
if (!world) {
  console.info(`Generating new world: "${worldName}"`);
  world = generateWorld(
    worldName, // Use worldName as the seed for generation
    Rules.settings.map_size,
    Rules.settings.map_frequency,
    Rules.settings.map_amplitude,
    Rules.settings.map_min,
    Rules.settings.map_max,
    Rules.settings.map_octaves,
    Rules.settings.map_persistence
  );
  // Save the newly created world if persistence is enabled
  if (worldPersistence && Config.dbConnectionString) {
    await enqueueSave(world);
  }
} else {
  console.info(`World "${worldName}" loaded from database`);
}

prepareWorld(world);

// Kick off Gameloop
const game = new GameServer(world);
game.run();

// Serial snapshots prevent an older save from overwriting newer progression.
const saveTimer = worldPersistence ? setInterval(() => {
  void enqueueSave(world).catch(() => console.error("Periodic world save failed."));
}, 5 * 60 * 1000) : null;

// Listen to connections
const port: number = Config.port

const corsOrigins = Config.clientUrls.split(",")
const http = createServer();
const io = new Server(http, {
  cors: {
    origin: corsOrigins,
    credentials: true,
  },
})

io.on("connection", async (socket) => {
  // Check for both types of auth - Clerk token or local user
  const { token, user } = socket.handshake.auth;
  
  let userId: string | null = null;
  let username: string | null = null;
  
  // If in dev mode with no auth required, accept user from auth
  const skipAuth = Config.nodeEnv === 'development' && !Config.forceAuth;
  
  if (skipAuth && validUser(user)) {
    userId = user;
    username = user;
  } 
  // Otherwise verify token if provided
  else if (typeof token === "string" && token.length > 0 && token.length <= 8192) {
    const userObject = await verifyToken(token);
    if (userObject) {
      userId = userObject.id;
      username = userObject.username;
    }
  }
  
  if (!userId) {
    console.warn(`Invalid authentication`);
    socket.disconnect();
    return;
  }

  console.log(`User "${username}" connected to world "${worldName}"`);

  socket.on("disconnect", function () {
    console.log(`User "${username}" disconnected from world "${worldName}"`);
  });

  if (!socket.connected) return;
  try { await game.onPlayerInitialize(socket, userId); }
  catch { console.error("Player initialization failed."); socket.disconnect(true); }
});

http.listen(port, Config.host, () => console.info(`Server listening on ${Config.host}:${port}`));
let shuttingDown = false;
for (const signal of ["SIGINT", "SIGTERM", "SIGQUIT"] as const) {
  process.on(signal, async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    game.stop();
    if (saveTimer) clearInterval(saveTimer);
    io.disconnectSockets(true);
    let exitCode = 0;
    try { if (worldPersistence) await enqueueSave(world); }
    catch { console.error("Final world save failed."); exitCode = 1; }
    finally { io.close(() => process.exit(exitCode)); }
  });
}


async function verifyToken(token: string): Promise<User | null> {
  const clerk = Config.clerkSecretKey 
    ? createClerkClient({ secretKey: Config.clerkSecretKey })
    : null;
  if (!clerk) return null;
  
  try {
    const result = await clerk.verifyToken(token);
    const user = await clerk.users.getUser(result.sub)
    return user;
  } catch (error) {
    console.error('Token verification failed.');
    return null;
  }
}
