import { Tile } from "../../../shared/objects"
import buildings from "../../../shared/templates/buildings.json"
import BuildingTemplate from "./BuildingTemplate"

const TileInfo = ({ tile }: { tile: Tile }) => {
  if (!tile) {
    return <div>No tile selected</div>
  }

  return (
    <div className="flex">
      <div className="w-full">
        <div>
          Position: {tile.hex.q}, {tile.hex.r}
        </div>
        <div>Biome: {tile.biome}</div>
        <div>Height: {tile.height}</div>
        <div>Precipitation: {tile.precipitation}</div>
        <div>Temperature: {tile.temperature}</div>
        {/* <div>Resources: {JSON.stringify(tile.resources)}</div> */}
      </div>
      <div className="w-full">
        {Object.keys(buildings).map((buildingKey) => {
          return (
            <BuildingTemplate
              key={buildingKey}
              tile={tile}
              building={buildings[buildingKey]}
            />
          )
        })}
      </div>
    </div>
  )
}

export default TileInfo
