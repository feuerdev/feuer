import { getTileById } from "../../../shared/objectutil"

const TileInfo = ({ selection }: { selection: number }) => {
  const tile = getTileById(selection, window.game.world.tiles)

  if (!tile) {
    return <div>No tile selected</div>
  }

  return (
    <div>
      <div>Selection: {selection}</div>
      <div>
        Position: {tile.hex.q}, {tile.hex.r}
      </div>
      <div>Biome: {tile.biome}</div>
      <div>Height: {tile.height}</div>
      <div>Precipitation: {tile.precipitation}</div>
      <div>Temperature: {tile.temperature}</div>
      <div>Resources: {JSON.stringify(tile.resources)}</div>
    </div>
  )
}

export default TileInfo
