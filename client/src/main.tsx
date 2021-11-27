import Game from "./game"
import * as React from "react"
import ReactDOM from "react-dom"
import { getUid } from "./auth"

class Hud extends React.Component {
  render() {
    return <div>HUD</div>
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const uid = localStorage.getItem("uid")
  new Game(uid)

  const hudContainer = document.querySelector("#hud")

  ReactDOM.render(<Hud />, hudContainer)
})
