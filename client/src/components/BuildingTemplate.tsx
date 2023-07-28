import { TBuildingTemplate, Tile } from "../../../shared/objects"
import EventBus from "../game/eventbus"

const BuildingTemplate = ({
  building,
  tile,
}: {
  building: TBuildingTemplate
  tile: Tile
}) => {
  function requestConstruction(): void {
    EventBus.shared().emitSocket("request construction", {
      pos: tile.hex,
      type: building.key,
    })
  }

  return (
    <div className="flex gap-4">
      <img
        className="w-16 h-16 self-center"
        src={"img/" + building.texture + ".png"}
        alt={building.name}
      />
      <div>
        <h3>{building.name}</h3>
        <p>Spotting: {building.spotting}</p>
        <p>Cost: {JSON.stringify(building.cost)}</p>
        <p>Production: {JSON.stringify(building.production)}</p>
      </div>
      <button onClick={() => requestConstruction()}>Construct</button>
    </div>
  )
}

export default BuildingTemplate
