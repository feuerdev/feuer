const GroupInfo = ({ selection }: { selection: number }) => {
  const group = window.game.world.groups[selection]

  if (!group) {
    return <div>No group selected</div>
  }
  
  return (
    <div>
      <div>Selection: {selection}</div>
      <div>Owner: {group.owner}</div>
      <div>Spotting: {group.spotting}</div>
      <div>Target Hexes: {group.targetHexes.length}</div>
      <div>
        Position: {group.pos.q}, {group.pos.r}
      </div>
      <div>Movement Status: {group.movementStatus}</div>
      <div>Units: {group.units.length}</div>
      <div>Resources: {JSON.stringify(group.resources)}</div>
    </div>
  )
}

export default GroupInfo
