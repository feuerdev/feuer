export type Resources = {
  //building materials
  wood: number
  stone: number
  //food
  fish: number
  wheat: number
  meat: number
  berries: number
  //intermediate resources
  iron: number
  steel: number
  gold: number
  cloth: number
  leather: number
  //weapons, armor
  sword: number
  spear: number
  bow: number
  arrow: number
  //animals
  horse: number
  ox: number
}

export default Resources

export function create(): Partial<Resources> {
  return {
    wood: 0,
    stone: 0,
    fish: 10,
    wheat: 0,
    meat: 0,
    berries: 0,
    iron: 0,
    steel: 0,
    gold: 0,
    cloth: 0,
    leather: 0,
    sword: 0,
    spear: 0,
    bow: 0,
    arrow: 0,
    horse: 0,
    ox: 0,
  }
}
