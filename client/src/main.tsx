import Game from "./game"
import * as React from "react"
import ReactDOM from "react-dom"
import Renderer from "./renderer"
import Hud from "./hud/hud"
import { io } from "socket.io-client"
import EventBus from "./eventbus"

document.addEventListener("DOMContentLoaded", async () => {
  startLoading()
  const uid = localStorage.getItem("uid")
  const renderer = new Renderer()
  await renderer.load()

  const socket = io(`${window.location.host}`, { transports: ["websocket"] })
  socket.on("connect", () => {
    EventBus.shared().emit("game connected")

    // Propagate any events
    socket.onAny((eventName: string, data) => {
      EventBus.shared().emit(eventName, data)
    })

    // Send initialization event to server
    socket.emit("initialize", uid)
  })

  socket.on("disconnect", () => {
    EventBus.shared().emit("game disconnected")
  })

  EventBus.shared().on("game request", ({ detail }) => {
    socket.emit(detail.type, detail.data)
  })

  const world = {
    tiles: {},
    groups: {},
    units: [],
    buildings: [],
    playerRelations: {},
    battles: [],
  }
  const game = new Game(uid, world, renderer)
  game.registerEventListeners()
  window["game"] = game

  const hudContainer = document.querySelector("#hud")
  ReactDOM.render(<Hud />, hudContainer)
  stopLoading()
})

function startLoading() {
  document.querySelector(".loading")?.classList.remove("hidden")
}

function stopLoading() {
  document.querySelector(".loading")?.classList.add("hidden")
}

declare global {
  interface Window {
    game: Game
  }
}
