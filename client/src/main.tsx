import Game from "./game"
import * as React from "react"
import ReactDOM from "react-dom"
import Renderer from "./renderer"
import Connection from "./connection"

class Hud extends React.Component {
  render() {
    return <div>HUD</div>
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  startLoading()
  const uid = localStorage.getItem("uid")
  const renderer = new Renderer()
  await renderer.load()
  const connection = new Connection(`${window.location.host}`, uid)
  const world = {
    tiles: {},
    groups: {},
    units: [],
    buildings: [],
    playerRelations: {},
    battles: [],
  }
  const game = new Game(uid, world, renderer, connection)
  game.registerEventListeners()
  connection.listener = game
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
