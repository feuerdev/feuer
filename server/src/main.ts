import { Server } from "socket.io"
import { generateWorld } from "./mapgen"
import * as Rules from "../../shared/rules.json"
import GameServer from "./gameserver"
// import Hex from "../../shared/hex"
import Config from "./util/environment"

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
const io = new Server(port, {
  cors: {
    origin: "http://localhost:3000", //TODO: set sensible value
    credentials: true,
  },
})

io.on("connection", async (socket) => {
  // const token = socket.handshake.auth.token as string | undefined
  // if (!token) {
  //   console.error("no token received")
  //   socket.disconnect()
  //   return
  // }
  const cookies = socket.request.headers.cookie
  console.log(`Received Cookies: ${cookies}`)

  // TODO validate session
  if (!cookies) {
    console.error("invalid id token provided")
    socket.disconnect()
    return
  }

  socket.on("disconnect", function () {
    console.log("Someone disconnected", cookies)
  })

  // console.log("Someone connected", decodedToken?.uid)
  // game.onPlayerInitialize(socket, decodedToken?.uid)
  // socket.on("disconnect", () => game.onPlayerDisconnected(socket))
  // socket.on("request tiles", (data: Hex[]) => game.onRequestTiles(socket, data))
  // socket.on("request group", (id: number) => game.onRequestGroup(socket, id))
  // socket.on("request movement", (data) => game.onRequestMovement(socket, data))
  // socket.on("request construction", (data) =>
  //   game.onRequestConstruction(socket, data)
  // )
  // socket.on("request relation", (data) => game.onRequestRelation(socket, data))
  // socket.on("request disband", (data) => game.onRequestDisband(socket, data))
  // socket.on("request transfer", (data) => game.onRequestTransfer(socket, data))
  // socket.on("request unit add", (data) => game.onRequestUnitAdd(socket, data))
  // socket.on("request unit remove", (data) =>
  //   game.onRequestUnitRemove(socket, data)
  // )
  // // socket.on("request upgrade", (data) => game.onRequestUpgrade(socket, data))
  // socket.on("request demolish", (data) => game.onRequestDemolish(socket, data))
})

console.log("Server running on port:", Config.port)
