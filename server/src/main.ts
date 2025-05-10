import { Server } from "socket.io"
import { generateWorld } from "./mapgen.js"
import Rules from "../../shared/rules.json" with { type: "json" };
import GameServer from "./gameserver.js"
import Config from "./environment.js"
import { createClerkClient, User } from '@clerk/clerk-sdk-node';

// Create a Clerk client if CLERK_SECRET_KEY is present
const clerk = Config.clerkSecretKey 
  ? createClerkClient({ secretKey: Config.clerkSecretKey })
  : null;

// Determine if we're in development mode and not forcing auth
const isDevNoAuth = Config.nodeEnv === 'development' && !Config.forceAuth;

// Initialize ID counter
let idCounter = -1
export const getNextId = () => {
  return ++idCounter
}

// Generate world
const world = generateWorld(
  `${Math.random()}`,
  Rules.settings.map_size,
  Rules.settings.map_frequency,
  Rules.settings.map_amplitude,
  Rules.settings.map_min,
  Rules.settings.map_max,
  Rules.settings.map_octaves,
  Rules.settings.map_persistence
)

// Kick off Gameloop
const game = new GameServer(world)
game.run()

// Listen to connections
const port: number = Config.port

const corsOrigins = Config.clientUrls.split(",")
const io = new Server(port, {
  cors: {
    origin: corsOrigins,
    credentials: true,
  },
})

async function verifyToken(token: string): Promise<User | null> {
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

io.on("connection", async (socket) => {
  // Check for both types of auth - Clerk token or local user
  const { token, user } = socket.handshake.auth;
  
  let userId: string | null = null;
  let username: string | null = null;
  
  // If in dev mode with no auth required, accept user from auth
  if (isDevNoAuth && user) {
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

  console.log(`User "${username}" connected`);

  socket.on("disconnect", function () {
    console.log(`User "${username}" disconnected`);
  });

  await game.onPlayerInitialize(socket, userId);
});

console.info("Server running on port: " + port);
