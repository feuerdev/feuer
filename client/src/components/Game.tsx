import { useEffect } from "react"
import Hud from "./Hud"
import Renderer from "../game/renderer"
import GameClass from "../game/game"
import PubSub from "pubsub-js"
import { useAppSelector } from "../store/hooks"
import { selectUser } from "../store/auth"
import { socket } from "../game/socket"
import { World } from "../../../shared/objects"

const Game = () => {
  const user = useAppSelector(selectUser)

  // Launch game
  useEffect(() => {
    const token = PubSub.subscribe("game request", (_, data) => {
      socket.emit(data.detail.type, data.detail.data)
    })

    const world: World = {
      tiles: {},
      groups: {},
      units: [],
      buildings: {},
      playerRelations: {},
      battles: [],
      idCounter: 0,
      players: {},
    }
    const renderer = new Renderer()
    renderer.start()
    const game = new GameClass(user.uid, world, renderer)
    window["game"] = game

    return () => {
      PubSub.unsubscribe(token)
      PubSub.clearAllSubscriptions()
    }
  }, [])

  return (
    <>
      <Hud />
      <canvas
        className="h-screen w-screen"
        onContextMenu={(e) => {
          e.preventDefault()
        }}
      />
    </>
  )
}

export default Game
