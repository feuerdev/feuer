import { Server } from "socket.io"
import { generateWorld } from "./mapgen.js"
import Rules from "../../shared/rules.json" with { type: "json" };
import GameServer from "./gameserver.js"
import Config from "./environment.js"
import { Hex } from "../../shared/hex.js";

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

io.on("connection", async (socket) => {
  const user = socket.handshake.auth.user
  if (!user) {
    console.warn(`Invalid auth received: ${user}`)
    socket.disconnect()
    return
  }

  console.log(`User "${user}" connected`)

  socket.on("disconnect", function () {
    console.log(`User "${user}" disconnected`)
  })

  await game.onPlayerInitialize(socket, user)
})

console.info("Server running on port: " + port)
