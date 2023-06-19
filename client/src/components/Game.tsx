import { Loader, utils } from "pixi.js"
import { useEffect, useState } from "react"
import { useAuthContext } from "./AuthContext"
import Hud from "./Hud"
import Sprites from "../game/sprites.json"
import Loading from "./Loading"
import { useSocketContext } from "./SocketContext"
import Renderer from "../game/renderer"
import GameClass from "../game/game"
import EventBus from "../game/eventbus"
import PubSub from "pubsub-js"

const Game = () => {
  const { user } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const { socket, connecting } = useSocketContext()

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
    game.registerEventListeners()
    window["game"] = game

    // Propagate any events
    socket.onAny((eventName: string, data: any) => {
      EventBus.shared().emit(eventName, data)
      console.log("mesage received", eventName, data)
    })

    const token = PubSub.subscribe("game request", (_, data) => {
      socket.emit(data.type, data.data)
    })

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
