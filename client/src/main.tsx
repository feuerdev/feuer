import Game from "./game"
import * as React from "react"
import ReactDOM from "react-dom"

class Hud extends React.Component {
  render() {
    return <div>HUD</div>
  }
}

document.addEventListener("DOMContentLoaded", function () {
  new Game()

  const hudContainer = document.querySelector("#hud")

  ReactDOM.render(<Hud />, hudContainer)
})
