import { Loader, utils } from "pixi.js"
import { useEffect, useState } from "react"
import Hud from "./Hud"
import Sprites from "../game/sprites.json"
import Loading from "./Loading"
import { useSocketContext } from "./SocketContext"
import Renderer from "../game/renderer"
import GameClass from "../game/game"
import PubSub from "pubsub-js"
import { useAppSelector } from "../store/hooks"
import { selectUser } from "../store/auth"

const Game = () => {
  const [loading, setLoading] = useState(false)
  const { socket, connecting } = useSocketContext()

  const user = useAppSelector(selectUser)

  // Load all sprites on mount
  useEffect(() => {
    setLoading(true)

    Loader.shared.reset()
    for (const sprite of Sprites) {
      Loader.shared.add(sprite, `../img/${sprite}.png`)
    }
    Loader.shared.load(() => {
      setLoading(false)
    })

    return () => {
      utils.clearTextureCache()
    }
  }, [])

  // Launch game when sprites are loaded and socket is connected
  useEffect(() => {
    if (!socket || !user || loading) return

    const token = PubSub.subscribe("game request", (_, data) => {
      socket.emit(data.detail.type, data.detail.data)
    })

    const world = {
      tiles: {},
      groups: {},
      units: [],
      buildings: [],
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
      socket.offAny()
      PubSub.unsubscribe(token)
      PubSub.clearAllSubscriptions()
    }
  }, [socket, loading])

  if (loading || connecting) {
    return <Loading />
  }

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

declare global {
  interface Window {
    game: GameClass
  }
}
