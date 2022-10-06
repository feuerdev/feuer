import * as React from "react"

const useForceUpdate = () => {
  const [value, setValue] = React.useState(0) // integer state
  return () => setValue((value) => value + 1) // update state to force render
  // An function that increment 👆🏻 the previous state like here
  // is better than directly setting `value + 1`
}

export default function Hud() {
  const [selection, setSelection] = React.useState(null)

  const forceUpdate = useForceUpdate()

  return (
    <div>
      <div id="top-bar" className="w-full bg-yellow-900 fixed top-0 flex">
        <button className="flex-end" onClick={forceUpdate}>
          Refresh
        </button>
      </div>
      <div id="bottom-bar" className="w-full h-1/5 bg-yellow-900 fixed bottom-0">
        <code>{JSON.stringify(window.game.selection)}</code>
      </div>
    </div>
  )
}
