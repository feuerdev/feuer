import { Server } from "socket.io"
import { generateWorld } from "./mapgen.js"
import Rules from "../../shared/rules.json" with { type: "json" };
import GameServer from "./gameserver.js"
import Config from "./environment.js"
import { createClerkClient, User } from '@clerk/clerk-sdk-node';
import { initDatabase, listWorlds, loadWorld, saveWorld } from "./world.js";

// Initialize ID counter
let idCounter = -1
export const getNextId = () => {
  return ++idCounter
}

// Initialize and load or generate world
let world;

async function initializeWorld() {
  const worldName = Config.worldName;
  console.info(`Using world name: "${worldName}"`);
  
  // Initialize database if connection string is provided
  if (Config.dbConnectionString) {
    await initDatabase();
    
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
    
    // Save the newly created world if database is configured
    if (Config.dbConnectionString) {
      await saveWorld(world);
    }
  } else {
    console.info(`World "${worldName}" loaded from database`);
  }
  
  // Kick off Gameloop
  const game = new GameServer(world);
  game.run();
  
  // Set up periodic saving if database is configured
  if (Config.dbConnectionString) {
    // Save every 5 minutes and on process exit
    const SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes
    setInterval(() => {
      saveWorld(world);
    }, SAVE_INTERVAL);
    
    // Save on graceful shutdown
    ['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => {
      process.on(signal, async () => {
        console.info(`Received ${signal}, saving world "${worldName}"...`);
        await saveWorld(world);
        process.exit(0);
      });
    });
  }
  
  // Listen to connections
  const port: number = Config.port

  const corsOrigins = Config.clientUrls.split(",")
  const io = new Server(port, {
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
    
    if (skipAuth && user) {
      userId = user;
      username = user;
    } 
    // Otherwise verify token if provided
    else if (token) {
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

    await game.onPlayerInitialize(socket, userId);
  });

  console.info(`Server running on port ${port} with world "${worldName}"`);
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
    console.error('Token verification failed:', error);
    return null;
  }
}

// Start the application
initializeWorld().catch(err => {
  console.error("Failed to initialize world:", err);
  process.exit(1);
});
