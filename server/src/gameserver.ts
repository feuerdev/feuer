import Buildings from "../../shared/templates/buildings.json" with { type: "json" };
import { astar } from "../../shared/pathfinding.js"
import { Socket } from "socket.io"
import { Hashtable } from "../../shared/util.js"
import {
  Building,
  Unit,
  World,
  Tile,
  Biome,
  TBuildingTemplate,
  Battle,
  UnitBehavior,
  SelectionType,
  getSelectionTypeName,
} from "../../shared/objects.js"
import * as PlayerRelation from "../../shared/relation.js"
import * as Battles from "./battle.js"
import { createUnit } from "./unit.js"
import { createBuilding, upgradeBuilding } from "./building.js"
import { EnumRelationType } from "../../shared/relation.js"
import {
  isNavigable,
  subtractResources,
} from "../../shared/objectutil.js"
import { create, equals, hash, neighborsRange, Hex } from "../../shared/hex.js"
import { Resources } from "../../shared/resources.js"
import Config from "./environment.js";
import { Player } from "../../shared/player.js";


export default class GameServer {
  private socketplayer: {} = {}
  private uidsockets: {} = {}

  private world: World

  //#region Gameloop Variables
  private readonly updaterate = Math.round(1000 / Config.updateRate)
  private readonly defaultDelta = Math.round(1000 / Config.referenceRate)
  //#endregion

  constructor(world: World) {
    this.world = world
  }

  //Gameloop
  private previousTick = Date.now()
  private actualTicks = 0
  run() {
    let gameloop = () => {
      let timeSincelastFrame = Date.now() - this.previousTick
      this.previousTick = Date.now()
      this.actualTicks++
      this.update(this.updaterate / this.defaultDelta)
      this.updateNet(this.updaterate / this.defaultDelta)
      if (
        this.actualTicks > 5 &&
        Math.abs(timeSincelastFrame - this.updaterate) > 30
      ) {
        console.warn("Warning something is fucky with the gameloop")
      }
    }
    setInterval(gameloop, this.updaterate)
  }

  resume() {
    console.info("Game resumed")
    this.run()
  }

  //Loops
  update(deltaFactor: number) {
    //Unit Movement
    Object.values(this.world.units).forEach((unit) => {
      if (unit.targetHexes.length > 0) {
        const currentTile = this.world.tiles[hash(unit.pos)]
        const nextHex = unit.targetHexes[0]

        if (!nextHex || !currentTile) return

        const nextTile = this.world.tiles[hash(nextHex)]

        if (!nextTile) return

        unit.movementStatus +=
          calculateMovementProgress(unit, currentTile, nextTile) * deltaFactor
        if (unit.movementStatus > 100) {
          unit.pos = unit.targetHexes.splice(0, 1)[0]!
          unit.movementStatus = 0
          this.updatePlayerVisibilities(unit.owner)
          this.checkForBattle(unit)
        }
      }
    })

    //Resource Gathering
    Object.values(this.world.buildings).forEach((building) => {
      let tile = this.world.tiles[hash(building.position)]
      
      // Handle resource generation from assigned units
      building.slots.forEach((slot, slotIndex) => {
        if (slot.assignedUnitId) {
          const assignedUnit = this.world.units[slot.assignedUnitId]
          
          // Skip if unit no longer exists or has been moved away from building
          if (!assignedUnit || !equals(assignedUnit.pos, building.position)) {
            // Clear the assignment
            slot.assignedUnitId = undefined
            return
          }
          
          // Get the resource type for this slot
          const resourceType = slot.resourceType
          
          // Calculate resource generation based on:
          // 1. Slot efficiency
          // 2. Unit's gathering efficiency for this resource type
          
          // Get unit's efficiency for this resource category
          let unitEfficiency = 1.0
          if (resourceType === 'wood') {
            unitEfficiency = assignedUnit.gatheringEfficiency.wood
          } else if (resourceType === 'stone') {
            unitEfficiency = assignedUnit.gatheringEfficiency.stone
          } else if (resourceType === 'iron') {
            unitEfficiency = assignedUnit.gatheringEfficiency.iron
          } else if (resourceType === 'gold') {
            unitEfficiency = assignedUnit.gatheringEfficiency.gold
          } else if (['fish', 'wheat', 'meat', 'berries'].includes(resourceType)) {
            unitEfficiency = assignedUnit.gatheringEfficiency.food
          }
          
          // Calculate final production rate
          const productionRate = slot.efficiency * unitEfficiency * /*resourceAvailabilityFactor * */ deltaFactor
          
          // Add resources to the tile
          if (!tile.resources[resourceType]) {
            tile.resources[resourceType] = 0
          }
          tile.resources[resourceType] += productionRate
          
          // Emit resource generation event
          // Only emit if the amount is significant enough to show
          if (productionRate >= 0.1) {
            const socket = this.uidsockets[building.owner];
            if (socket && socket.connected) {
              socket.emit("gamestate resource generation", {
                buildingId: building.id,
                resourceType: resourceType,
                amount: productionRate
              });
            }
          }
        }
      })
    })

    //Battles
    let i = this.world.battles.length
    while (i--) {
      let battle = this.world.battles[i]
      // Process battle and potentially resolve it
      this.resolveBattle(battle)
    }
  }

  /**
   * Battle resolution between two units with integrated finish logic
   */
  resolveBattle(battle: Battle): void {
    // Check for immediate flee behaviors
    if (battle.attacker.behavior === UnitBehavior.FleeIfAttacked) {
      console.log(`Unit ${battle.attacker.id} (Attacker) has FleeIfAttacked behavior and attempts to flee immediately.`);
      battle.attacker.morale = 1; // Mark as fled
      // Battle might end here if defender doesn't need to act, or could give defender a free hit (not implemented)
      // Skip the rest of battle processing and go directly to finish logic
    }
    else if (battle.defender.behavior === UnitBehavior.FleeIfAttacked) {
      console.log(`Unit ${battle.defender.id} (Defender) has FleeIfAttacked behavior and attempts to flee immediately.`);
      battle.defender.morale = 1; // Mark as fled
      // Skip the rest of battle processing and go directly to finish logic
    }
    else {
      // Regular battle logic for units that aren't immediately fleeing
      const attackerStrengthFactor = 1 + ((battle.attacker.strength - 50) / 100);
      const attackerAgilityFactor = 1 + ((battle.attacker.agility - 5) / 20); 
      const defenderStrengthFactor = 1 + ((battle.defender.strength - 50) / 100);
      const defenderAgilityFactor = 1 + ((battle.defender.agility - 5) / 20);

      const attackerEffectiveAttack = (battle.attacker.strength) * attackerStrengthFactor * ((battle.attacker.morale) / 100);
      const defenderEffectiveDefense = (battle.defender.strength) * defenderStrengthFactor * ((battle.defender.morale) / 100);
      
      // Calculate damage - agility gives a chance to reduce/avoid some damage
      const attackerDamageRoll = Math.random(); // 0 to 1
      const defenderDamageRoll = Math.random(); // 0 to 1

      let attackerDamageMultiplier = 1;
      if (defenderDamageRoll < defenderAgilityFactor * 0.1) { // e.g. 10 agility = 15% chance to reduce damage by half
        attackerDamageMultiplier = 0.5; 
      }

      let defenderDamageMultiplier = 1;
      if (attackerDamageRoll < attackerAgilityFactor * 0.1) { // e.g. 10 agility = 15% chance to reduce damage by half
        defenderDamageMultiplier = 0.5;
      }

      const attackerRawDamage = Math.max(0, attackerEffectiveAttack - defenderEffectiveDefense / 2);
      const defenderRawDamage = Math.max(0, defenderEffectiveDefense - attackerEffectiveAttack / 2);

      const finalAttackerDamage = attackerRawDamage * attackerDamageMultiplier;
      const finalDefenderDamage = defenderRawDamage * defenderDamageMultiplier;
      
      // Apply damage to morale
      battle.defender.morale = Math.max(0, battle.defender.morale - finalAttackerDamage);
      battle.attacker.morale = Math.max(0, battle.attacker.morale - finalDefenderDamage);

      // Check for fleeing conditions (e.g., morale < 10%)
      const FLEE_THRESHOLD = 10;
      let attackerFled = false;
      let defenderFled = false;

      if (battle.attacker.morale < FLEE_THRESHOLD && battle.attacker.morale > 0) { // Must have some morale to decide to flee
        // Attacker attempts to flee. For now, auto-success.
        console.log(`Unit ${battle.attacker.id} attempts to flee!`);
        attackerFled = true;
        // For now, if flee, their morale is set to a very low non-zero value to signify they survived but fled.
        battle.attacker.morale = 1;
      }

      if (!attackerFled && battle.defender.morale < FLEE_THRESHOLD && battle.defender.morale > 0) {
        // Defender attempts to flee if attacker didn't already cause battle to end.
        console.log(`Unit ${battle.defender.id} attempts to flee!`);
        defenderFled = true;
        battle.defender.morale = 1;
      }

      if (attackerFled || defenderFled) {
        console.log("A unit has fled the battle.");
      }
    }
    
    // Check if battle is over
    if (battle.attacker.morale <= 0 || battle.defender.morale <= 0) {
      // Store position and prepare tracking of remaining units
      const battlePosition = {...battle.position};
      let remainingUnits = [];
      
      // Handle defeated attacker
      if (battle.attacker.morale <= 0) {
        // Find closest friendly building for retreat
        const closestBuilding = this.findClosestFriendlyBuilding(battle.attacker);
        
        if (closestBuilding) {
          // Reset morale to minimum viable value
          battle.attacker.morale = 10;
          
          // Set retreat path to closest building
          battle.attacker.targetHexes = astar(this.world.tiles, battle.attacker.pos, closestBuilding.position);
          battle.attacker.movementStatus = 0;
          
          // Change behavior to fleeing
          battle.attacker.behavior = UnitBehavior.FleeIfAttacked;
          
          console.log(`Unit ${battle.attacker.id} is retreating to building at ${JSON.stringify(closestBuilding.position)}`);
          remainingUnits.push(battle.attacker);
        } else {
          // No friendly building to retreat to, unit is lost
          console.log(`Unit ${battle.attacker.id} has nowhere to retreat to and is disbanded`);
          delete this.world.units[battle.attacker.id];
        }
      } else {
        // Attacker survived (possibly fled)
        remainingUnits.push(battle.attacker);
      }
      
      // Handle defeated defender
      if (battle.defender.morale <= 0) {
        // Find closest friendly building for retreat
        const closestBuilding = this.findClosestFriendlyBuilding(battle.defender);
        
        if (closestBuilding) {
          // Reset morale to minimum viable value
          battle.defender.morale = 10;
          
          // Set retreat path to closest building
          battle.defender.targetHexes = astar(this.world.tiles, battle.defender.pos, closestBuilding.position);
          battle.defender.movementStatus = 0;
          
          // Change behavior to fleeing
          battle.defender.behavior = UnitBehavior.FleeIfAttacked;
          
          console.log(`Unit ${battle.defender.id} is retreating to building at ${JSON.stringify(closestBuilding.position)}`);
          remainingUnits.push(battle.defender);
        } else {
          // No friendly building to retreat to, unit is lost
          console.log(`Unit ${battle.defender.id} has nowhere to retreat to and is disbanded`);
          delete this.world.units[battle.defender.id];
        }
      } else {
        // Defender survived (possibly fled)
        remainingUnits.push(battle.defender);
      }
      
      // Remove battle from the list
      this.world.battles.splice(this.world.battles.indexOf(battle), 1);
      
      // Update visibilities
      this.updatePlayerVisibilities(battle.attacker.owner);
      this.updatePlayerVisibilities(battle.defender.owner);
      
      // Check for new potential battles between remaining units and other units on the same tile
      this.checkForBattlesAtPosition(battlePosition, remainingUnits);
    }
  }
  
  /**
   * Check for potential battles at a specific position, typically after a battle has concluded
   */
  private checkForBattlesAtPosition(position: Hex, excludeUnits: Unit[] = []) {
    // Find all units at this position
    const unitsAtPosition = Object.values(this.world.units).filter(unit => 
      equals(unit.pos, position)
    );
    
    // Ignore units that were just in battle (to prevent immediate re-engagement)
    const excludeIds = excludeUnits.map(g => g.id);
    
    // Check each unit against others for potential battles
    for (const unit of unitsAtPosition) {
      // Skip units that were just in battle
      if (excludeIds.includes(unit.id)) continue;
      
      // Check this unit for battles
      this.checkForBattle(unit);
    }
  }
  
  /**
   * Find the closest friendly building for a unit
   * @param unit The unit looking for a friendly building
   * @returns The closest friendly building or null if none found
   */
  private findClosestFriendlyBuilding(unit: Unit): Building | null {
    let closestBuilding: Building | null = null;
    let shortestDistance = Number.MAX_SAFE_INTEGER;
    
    // Check all buildings owned by the same player
    Object.values(this.world.buildings).forEach(building => {
      if (building.owner === unit.owner) {
        // Skip buildings at the current position (as they don't provide safety)
        if (equals(building.position, unit.pos)) {
          return;
        }
        
        // Calculate simple distance (for now, a more accurate pathfinding distance could be used)
        const distance = this.calculateHexDistance(unit.pos, building.position);
        
        if (distance < shortestDistance) {
          shortestDistance = distance;
          closestBuilding = building;
        }
      }
    });
    
    return closestBuilding;
  }
  
  /**
   * Calculate straight-line hex distance between two hexes
   */
  private calculateHexDistance(a: Hex, b: Hex): number {
    return Math.max(
      Math.abs(a.q - b.q),
      Math.abs(a.r - b.r),
      Math.abs(a.s - b.s)
    );
  }

  checkForBattle(unit: Unit) {
    // Check if the unit is already in a battle
    const isAlreadyInBattle = this.world.battles.some(battle => 
      battle.attacker.id === unit.id || battle.defender.id === unit.id
    );
    
    if (isAlreadyInBattle) return;
    
    // Look for other units on the same hex that could be fought
    Object.values(this.world.units).forEach((otherUnit) => {
      // Skip if it's the same unit or not on the same hex
      if (unit.id === otherUnit.id || !equals(unit.pos, otherUnit.pos)) return;
      
      // Skip if same owner
      if (unit.owner === otherUnit.owner) return;
      
      // Skip if there's already a battle between these units
      if (this.world.battles.some(b => 
        (b.attacker.id === unit.id && b.defender.id === otherUnit.id) ||
        (b.defender.id === unit.id && b.attacker.id === otherUnit.id)
      )) return;
      
      // Check relation and behaviors
      const relation = this.world.playerRelations[
        PlayerRelation.hash(unit.owner, otherUnit.owner)
      ];
      const areHostile = !relation || relation.relationType === PlayerRelation.EnumRelationType.hostile;
      
      // Start battle if hostile and at least one unit is aggressive
      if (areHostile && 
          (unit.behavior === UnitBehavior.Aggressive || otherUnit.behavior === UnitBehavior.Aggressive)
      ) {
        this.world.battles.push(
          Battles.create(++this.world.idCounter, unit.pos, unit, otherUnit)
        );
        console.log(`New battle initiated between ${unit.id} and ${otherUnit.id}`);
      }
    });
  }

  updateNet(_delta) {
    for (let player of Object.values(this.world.players)) {
      if (player.initialized) {
        const socket: Socket = this.uidsockets[player.uid]
        if (socket && socket.connected) {
          let units = this.getVisibleUnits(player.visibleHexes)
          let battles = this.getVisibleBattles(player.visibleHexes)
          let buildings = this.getVisibleBuildings(player.visibleHexes)
          socket.emit("gamestate units", units)
          socket.emit("gamestate battles", battles)
          socket.emit("gamestate buildings", buildings)
        }
      }
    }
  }

  onPlayerDisconnected(socket: Socket) {
    const player: Player = this.socketplayer[socket.id]
    if (player) {
      console.info("Player Disconnected: " + player.uid)
      // Clean up socket listeners
      socket.removeAllListeners()
    }
  }

  /*
   * Check if if the uid is already known by the server.
   * If not, create a new player instance and link the uid to the socket.
   * If the uid is known, link the socket to the player instance.
   */
  async onPlayerInitialize(socket: Socket, uid: string) {
    let player = this.world.players[uid]
    if (!player) {
      player = {uid: uid, initialized: false, visibleHexes: [], discoveredHexes: []}
      player.uid = uid
      player.initialized = true

      console.info("New Player Connected: " + player.uid)

      //Give Player an initial Campsite
      let pos = this.getRandomSpawnHex()
      
      // Ensure the tile has 100 wood
      let tile = this.world.tiles[hash(pos)]
      if (!tile.resources.wood) {
        tile.resources.wood = 0
      }
      tile.resources.wood = 100
      tile.resources.stone = 100
      tile.resources.iron = 100
      tile.resources.gold = 100
      
      // Create initial campsite building
      let initialBuilding = createBuilding(
        ++this.world.idCounter,
        player.uid,
        "campsite",
        pos
      )
      this.world.buildings[initialBuilding.id] = initialBuilding

      // Create initial unit
      let initialUnit = createUnit(++this.world.idCounter, player.uid, pos)
      this.world.units[initialUnit.id] = initialUnit

      //Register player in Gamesever
      this.world.players[uid] = player
      this.updatePlayerVisibilities(uid)
    } else {
      console.info(`Player reconnected: ${player.uid}`)
      socket.emit("gamestate tiles", this.getTiles(player.discoveredHexes))
    }

    //Register player in Gamesever
    this.socketplayer[socket.id] = player
    this.uidsockets[uid] = socket

    // Setup socket listeners
    this.setupSocketListeners(socket)
  }

  private setupSocketListeners(socket: Socket) {
    socket.on("disconnect", () => this.onPlayerDisconnected(socket))
    socket.on("request tiles", (data: Hex[]) => this.onRequestTiles(socket, data))
    socket.on("request unit", (id: number) => this.onRequestUnit(socket, id))
    socket.on("request movement", (data) => this.onRequestMovement(socket, data))
    socket.on("request construction", (data) => this.onRequestConstruction(socket, data))
    socket.on("request relation", (data) => this.onRequestRelation(socket, data))
    socket.on("request change relation", (data) => this.onRequestChangeRelation(socket, data))
    socket.on("request disband", (data) => this.onRequestDisband(socket, data))
    socket.on("request transfer", (data) => this.onRequestTransfer(socket, data))
    socket.on("request demolish", (data) => this.onRequestDemolish(socket, data))
    socket.on("request assign unit", (data) => this.onRequestAssignUnit(socket, data))
    socket.on("request unassign unit", (data) => this.onRequestUnassignUnit(socket, data))
    socket.on("request upgrade building", (data) => this.onRequestUpgradeBuilding(socket, data))
    socket.on("request hire unit", (data) => this.onRequestHireUnit(socket, data))
    socket.on("request set unit behavior", (data) => this.onRequestSetUnitBehavior(socket, data))
    // Debug listener
    if (Config.nodeEnv === "development") {
      socket.on("debug:killEntity", (data: { type: SelectionType; id: number }) => {
        this.handleDebugKillEntity(socket, data);
      });
      socket.on("debug:addResources", (data: { targetType: SelectionType; targetId: number; resources: Partial<Resources> }) => {
        this.handleDebugAddResources(socket, data);
      });
      socket.on("debug:spawnBuilding", (data: { buildingKey: string; position: Hex }) => {
        this.handleDebugSpawnBuilding(socket, data);
      });
      socket.on("debug:spawnUnit", (data: { position: Hex }) => {
        this.handleDebugSpawnUnit(socket, data);
      });
    }
  }

  onRequestTiles(socket: Socket, data: Hex[]) {
    const player: Player = this.socketplayer[socket.id]
    if (player) {
      //TODO: Check if player has permission to see these tiles
      socket.emit("gamestate tiles", this.getTiles(data || player.discoveredHexes))
    }
  }

  /**
   * Currently only used to request an update for your own unit
   */
  onRequestUnit(socket: Socket, data: number) {
    const player: Player = this.socketplayer[socket.id]
    const unit = this.world.units[data]
    if (player && unit && player.uid === unit.owner) {
      socket.emit("gamestate unit", unit)
    }
  }

  onRequestMovement(socket: Socket, data: any) {
    let uid = this.getPlayerUid(socket.id)
    let selection: number = data.selection
    let target = create(data.target.q, data.target.r, data.target.s)
    const unit = this.world.units[selection]
    if (uid === unit?.owner) {
      // Unassign unit from building if it's moving away
      if (unit.assignedToBuilding !== undefined) {
        const buildingIdToUpdate = unit.assignedToBuilding; // Store ID before clearing
        const building = this.world.buildings[buildingIdToUpdate];
        if (building && unit.assignedToSlot !== undefined) {
          // Clear the assignment in the building slot
          building.slots[unit.assignedToSlot].assignedUnitId = undefined
          
          // Clear the assignment in the unit
          unit.assignedToBuilding = undefined
          unit.assignedToSlot = undefined

          // Emit building update to the client
          socket.emit("gamestate building", building);
        }
      }
      
      let targetTile = this.world.tiles[hash(target)]
      if (targetTile && isNavigable(targetTile)) {
        unit.movementStatus = 0
        unit.targetHexes = astar(this.world.tiles, unit.pos, target)
        return
      }
    }
  }

  onRequestConstruction(socket: Socket, data) {
    const uid = this.getPlayerUid(socket.id)
    if (!uid) {
      return
    }

    let pos = create(data.pos.q, data.pos.r, data.pos.s)
    let tile = this.world.tiles[hash(pos)]

    if (this.isAllowedToBuild(tile, uid, data.type)) {
      let building = createBuilding(++this.world.idCounter, uid, data.type, pos)
      subtractResources(tile, Buildings[data.type].cost)
      this.world.buildings[building.id] = building
      this.updatePlayerVisibilities(uid)
    }
  }

  /**
   * Get current relation between two players
   */
  onRequestRelation(socket: Socket, data) {
    const uid = this.getPlayerUid(socket.id)
    if (!uid) return
    
    // Ensure that at least one of the players is the requesting player
    if (uid !== data.id1 && uid !== data.id2) {
      console.warn(`Player ${uid} tried to request relation between ${data.id1} and ${data.id2}`)
      return
    }
    
    const hash = PlayerRelation.hash(data.id1, data.id2)
    let playerRelation = this.world.playerRelations[hash]
    
    if (!playerRelation) {
      // Create default neutral relation if none exists
      playerRelation = PlayerRelation.create(
        data.id1,
        data.id2,
        EnumRelationType.neutral
      )
      this.world.playerRelations[hash] = playerRelation
    }
    
    // Send the relation info to the requesting player
    socket.emit("gamestate relation", playerRelation)
  }

  onRequestTransfer(socket: Socket, data) {
    let uid = this.getPlayerUid(socket.id)
    const unit = this.world.units[data.unitId]
    if (unit.owner !== uid) {
      console.warn(
        `Player '${uid}' tried to transfer resources to unit he doesn't own`
      )
      return
    }

    if (unit) {
      let tile = this.world.tiles[hash(unit.pos)]
      let amount = data.amount
      let resource = data.resource

      if (!tile.resources[resource]) {
        tile.resources[resource] = 0
      }

      if (!unit.resources[resource]) {
        unit.resources[resource] = 0
      }

      if (
        tile.resources[resource] + amount >= 0 &&
        unit.resources[resource] - amount >= 0
      ) {
        tile.resources[resource] += amount
        unit.resources[resource] -= amount //TODO: Check if allowed
      }
    }
  }

  onRequestDemolish(socket: Socket, data) {
    const uid = this.getPlayerUid(socket.id)
    if (!uid) {
      return
    }
    let buildingToDemolish = this.world.buildings[data.buildingId]
    if (buildingToDemolish && buildingToDemolish.owner === uid) {
      delete this.world.buildings[buildingToDemolish.id]
      this.updatePlayerVisibilities(uid)
    }
  }

  /**
   * Handles a request to upgrade a building
   */
  onRequestUpgradeBuilding(socket: Socket, data: any) {
    const uid = this.getPlayerUid(socket.id)
    if (!uid) return
    
    const buildingId = data.buildingId
    const building = this.world.buildings[buildingId]
    
    // Validate ownership and existence
    if (!building || building.owner !== uid) {
      console.warn(`Invalid building upgrade request from player ${uid}`)
      return
    }
    
    // Check if building can be upgraded
    if (building.level >= building.maxLevel) {
      console.warn(`Building ${buildingId} is already at max level`)
      return
    }
    
    // Check if we have upgrade requirements defined
    if (!building.upgradeRequirements) {
      console.warn(`Building ${buildingId} has no upgrade requirements defined`)
      return
    }
    
    // Get the tile where the building is located
    const tile = this.world.tiles[hash(building.position)]
    if (!tile) {
      console.warn(`Building ${buildingId} is not on a valid tile`)
      return
    }
    
    // Check if there are enough resources on the tile
    if (!this.hasResources(tile, building.upgradeRequirements)) {
      console.warn(`Not enough resources on tile for upgrading building ${buildingId}`)
      return
    }
    
    const assignmentsToRestore: Array<{ unitId: number; resourceType: string, originalSlotIndex: number }> = [];
    const unitsToUpdateClient = new Set<number>();

    building.slots.forEach((slot, slotIndex) => {
      if (slot.assignedUnitId) {
        const unit = this.world.units[slot.assignedUnitId];
        if (unit) {
          assignmentsToRestore.push({ unitId: unit.id, resourceType: slot.resourceType, originalSlotIndex: slotIndex });
          // Proactively unassign unit, its state will be updated after attempting re-assignment
          unit.assignedToBuilding = undefined;
          unit.assignedToSlot = undefined;
          unitsToUpdateClient.add(unit.id); // Mark for client update
        }
      }
    });

    // Subtract resources from the tile
    subtractResources(tile, building.upgradeRequirements)
    
    // Upgrade the building
    const upgradedBuilding = upgradeBuilding(building)
    if (!upgradedBuilding) {
      console.warn(`Failed to upgrade building ${buildingId}`)
      // If upgrade fails, units are unassigned. We should send their updated (unassigned) state.
      assignmentsToRestore.forEach(assignment => {
        const unit = this.world.units[assignment.unitId];
        if (unit) {
          socket.emit("gamestate unit", unit);
        }
      });
      return
    }
    
    // Update the building in the world
    this.world.buildings[buildingId] = upgradedBuilding
    
    // Re-assign units to upgraded building
    assignmentsToRestore.forEach(assignment => {
      const unit = this.world.units[assignment.unitId];
      if (unit) {
        // Try to find a suitable slot in the upgraded building
        const newSlotIndex = upgradedBuilding.slots.findIndex(
          (newSlot, index) => newSlot.resourceType === assignment.resourceType && newSlot.assignedUnitId === undefined
        );

        if (newSlotIndex !== -1) {
          upgradedBuilding.slots[newSlotIndex].assignedUnitId = unit.id;
          unit.assignedToBuilding = upgradedBuilding.id;
          unit.assignedToSlot = newSlotIndex;
        }
        // If no suitable slot is found, the unit remains unassigned (already handled by proactive unassignment)
        unitsToUpdateClient.add(unit.id); // Ensure it's marked for update
      }
    });
    
    // Notify the client
    socket.emit("gamestate building", upgradedBuilding)
    socket.emit("gamestate tiles", { [hash(tile.hex)]: tile })

    // Notify client about updated units
    unitsToUpdateClient.forEach(unitId => {
      const unit = this.world.units[unitId];
      if (unit) {
        socket.emit("gamestate unit", unit);
      }
    });
    
    // Update player visibilities as spotting might have changed
    this.updatePlayerVisibilities(uid)
  }

  /**
   * Assigns a unit to a building slot
   */
  onRequestAssignUnit(socket: Socket, data: any) {
    const uid = this.getPlayerUid(socket.id)
    if (!uid) return
    
    const unitId = data.unitId
    const buildingId = data.buildingId
    const slotIndex = data.slotIndex
    
    const unit = this.world.units[unitId]
    const building = this.world.buildings[buildingId]
    
    // Validate ownership and existence
    if (!unit || !building || unit.owner !== uid || building.owner !== uid) {
      console.warn(`Invalid assignment request from player ${uid}`)
      return
    }
    
    // Check if unit is at the same position as the building
    if (!equals(unit.pos, building.position)) {
      console.warn(`Unit ${unitId} is not at the same position as building ${buildingId}`)
      return
    }
    
    // Check if slot exists
    if (slotIndex < 0 || slotIndex >= building.slots.length) {
      console.warn(`Invalid slot index ${slotIndex} for building ${buildingId}`)
      return
    }

    // Check if the unit is already assigned to a different slot in the same building
    if (unit.assignedToBuilding === buildingId && unit.assignedToSlot !== undefined && unit.assignedToSlot !== slotIndex) {
      console.warn(`Unit ${unitId} is already assigned to slot ${unit.assignedToSlot} in building ${buildingId}`)
      return;
    }
    
    // If slot is already assigned to another unit, unassign it
    const slot = building.slots[slotIndex]
    if (slot.assignedUnitId && slot.assignedUnitId !== unitId) {
      const previousUnit = this.world.units[slot.assignedUnitId]
      if (previousUnit) {
        previousUnit.assignedToBuilding = undefined
        previousUnit.assignedToSlot = undefined
      }
    }
    
    // Unassign unit from previous building if any (and it's a different building)
    if (unit.assignedToBuilding !== undefined && unit.assignedToBuilding !== buildingId) {
      const previousBuilding = this.world.buildings[unit.assignedToBuilding]
      if (previousBuilding && unit.assignedToSlot !== undefined) {
        previousBuilding.slots[unit.assignedToSlot].assignedUnitId = undefined
      }
    }
    
    // Assign unit to building slot
    slot.assignedUnitId = unitId
    unit.assignedToBuilding = buildingId
    unit.assignedToSlot = slotIndex
    
    // Notify the client
    socket.emit("gamestate unit", unit)
    socket.emit("gamestate building", building)
  }
  
  /**
   * Unassigns a unit from a building slot
   */
  onRequestUnassignUnit(socket: Socket, data: any) {
    const uid = this.getPlayerUid(socket.id)
    if (!uid) return
    
    const unitId = data.unitId
    
    const unit = this.world.units[unitId]
    
    // Validate ownership and existence
    if (!unit || unit.owner !== uid) {
      console.warn(`Invalid unassignment request from player ${uid}`)
      return
    }
    
    // Check if unit is assigned to a building
    if (unit.assignedToBuilding === undefined || unit.assignedToSlot === undefined) {
      console.warn(`Unit ${unitId} is not assigned to any building`)
      return
    }
    
    const building = this.world.buildings[unit.assignedToBuilding]
    if (building) {
      // Clear the assignment in the building slot
      building.slots[unit.assignedToSlot].assignedUnitId = undefined
      
      // Notify about the building update
      socket.emit("gamestate building", building)
    }
    
    // Clear the assignment in the unit
    unit.assignedToBuilding = undefined
    unit.assignedToSlot = undefined
    
    // Notify the client
    socket.emit("gamestate unit", unit)
  }

  /**
   * Handles a request to hire a new unit
   */
  onRequestHireUnit(socket: Socket, data: { buildingId: number, unitType: string }) {
    const uid = this.getPlayerUid(socket.id)
    if (!uid) return
    
    const { buildingId } = data
    const building = this.world.buildings[buildingId]
    
    // Validate ownership and existence
    if (!building || building.owner !== uid) {
      console.warn(`Invalid unit hiring request from player ${uid}`)
      return
    }
    
    // Define standard cost for hiring a unit
    const cost: Partial<Resources> = {
      berries: 15,
      wood: 5,
      stone: 5
    }
    
    // Check if player has enough resources to hire the unit
    const tile = this.world.tiles[hash(building.position)]
    if (!tile) return
    
    // Check if the required resources are available
    if (!this.hasResources(tile, cost)) {
      console.warn(`Not enough resources to hire a unit`)
      return
    }
    
    // Subtract resources
    subtractResources(tile, cost)
    
    // Create the new unit with random attributes
    const newUnit = createUnit(++this.world.idCounter, uid, building.position)
    this.world.units[newUnit.id] = newUnit
    
    // Notify the client
    socket.emit("gamestate unit", newUnit)
    socket.emit("gamestate tile", tile)
    
    // Update visibilities
    this.updatePlayerVisibilities(uid)
  }

  onRequestSetUnitBehavior(socket: Socket, data: { unitId: number; behavior: UnitBehavior }) {
    const uid = this.getPlayerUid(socket.id);
    if (!uid) return;

    const unit = this.world.units[data.unitId];
    if (!unit || unit.owner !== uid) {
      console.warn(`Player ${uid} cannot set behavior for unit ${data.unitId}`);
      return;
    }

    // Validate behavior value (optional, but good practice if values might be arbitrary)
    if (!Object.values(UnitBehavior).includes(data.behavior)) {
        console.warn(`Invalid behavior value received: ${data.behavior}`);
        return;
    }

    unit.behavior = data.behavior;
    console.log(`Unit ${unit.id} behavior set to ${UnitBehavior[unit.behavior]} by player ${uid}`);

    // Notify the client who made the change, and potentially other clients if this unit is visible to them.
    // For simplicity, just sending to the owner for now. A broader update might be needed.
    socket.emit("gamestate unit", unit);
    
    // If the unit is visible to other players, they should also get an update.
    // This can be handled by the general units update in updateNet, or by a targeted emit here.
    // For now, relying on existing updateNet which sends all visible units.
  }

  private handleDebugKillEntity(socket: Socket, data: { type: SelectionType; id: number }) {
    const uid = this.getPlayerUid(socket.id);
    if (!uid) {
      console.warn("DebugKillEntity: UID not found for socket.");
      return;
    }

    console.log(`DEBUG: Player ${uid} requested to delete entity type: ${getSelectionTypeName(data.type)}, ID: ${data.id}`);

    let ownerIdToUpdateVisibility: string | undefined;

    if (data.type === SelectionType.Unit) {
      const unit = this.world.units[data.id];
      if (unit) {
        ownerIdToUpdateVisibility = unit.owner;
        // Before deleting, unassign from any building slot
        if (unit.assignedToBuilding !== undefined && unit.assignedToSlot !== undefined) {
            const building = this.world.buildings[unit.assignedToBuilding];
            if (building && building.slots[unit.assignedToSlot]) {
                building.slots[unit.assignedToSlot].assignedUnitId = undefined;
                // Send update for the affected building
                const buildingOwnerSocket = this.uidsockets[building.owner];
                if (buildingOwnerSocket && buildingOwnerSocket.connected) {
                    buildingOwnerSocket.emit("gamestate building", building);
                }
            }
        }
        delete this.world.units[data.id];
        console.log(`DEBUG: Deleted unit ${data.id}`);
      } else {
        console.warn(`DEBUG: Unit ${data.id} not found for deletion.`);
      }
    } else if (data.type === SelectionType.Building) {
      const building = this.world.buildings[data.id];
      if (building) {
        ownerIdToUpdateVisibility = building.owner;
        // Unassign any units assigned to this building's slots
        building.slots.forEach(slot => {
            if (slot.assignedUnitId) {
                const unit = this.world.units[slot.assignedUnitId];
                if (unit) {
                    unit.assignedToBuilding = undefined;
                    unit.assignedToSlot = undefined;
                    // Send update for the affected unit
                    const unitOwnerSocket = this.uidsockets[unit.owner];
                    if (unitOwnerSocket && unitOwnerSocket.connected) {
                        unitOwnerSocket.emit("gamestate unit", unit);
                    }
                }
            }
        });
        delete this.world.buildings[data.id];
        console.log(`DEBUG: Deleted building ${data.id}`);
      } else {
        console.warn(`DEBUG: Building ${data.id} not found for deletion.`);
      }
    } else {
      console.warn(`DEBUG: Unknown entity type ${getSelectionTypeName(data.type)} for deletion.`);
      return; // Do nothing if type is unknown
    }

    // Update visibility for the owner of the deleted entity
    // The general updateNet will handle broadcasting the removal to all relevant players.
    if (ownerIdToUpdateVisibility) {
        this.updatePlayerVisibilities(ownerIdToUpdateVisibility);
    }
    // No specific emit needed here as updateNet will take care of changed game state for all players
  }

  private handleDebugAddResources(socket: Socket, data: { targetType: SelectionType; targetId: number; resources: Partial<Resources> }) {
    const uid = this.getPlayerUid(socket.id);
    if (!uid) {
      console.warn("DebugAddResources: UID not found for socket.");
      return;
    }

    console.log(`DEBUG: Player ${uid} requested to add resources to ${getSelectionTypeName(data.targetType)} ID ${data.targetId}`, data.resources);

    if (data.targetType === SelectionType.Tile) {
      const tile = Object.values(this.world.tiles).find(t => t.id === data.targetId);
      if (tile) {
        for (const resourceKey in data.resources) {
          const key = resourceKey as keyof Resources;
          if (tile.resources[key] === undefined) {
            tile.resources[key] = 0;
          }
          tile.resources[key]! += data.resources[key]!;
        }
        // Emit tile update to all players who can see it (or just the requester for simplicity for now, though tile updates usually go broader)
        // For now, relying on updateNet to eventually show this, or can send specific tile update.
        // Let's send a specific update to the requester for immediate feedback.
        socket.emit("gamestate tiles", { [hash(tile.hex)]: tile }); 
        console.log(`DEBUG: Added resources to tile ${data.targetId}. New resources:`, tile.resources);
      } else {
        console.warn(`DEBUG: Tile ${data.targetId} not found for adding resources.`);
      }
    } else if (data.targetType === SelectionType.Unit) {
      const unit = this.world.units[data.targetId];
      if (unit) {
        for (const resourceKey in data.resources) {
          const key = resourceKey as keyof Resources;
          if (unit.resources[key] === undefined) {
            unit.resources[key] = 0;
          }
          unit.resources[key]! += data.resources[key]!;
        }
        // Emit unit update only to the owner
        const unitOwnerSocket = this.uidsockets[unit.owner];
        if (unitOwnerSocket && unitOwnerSocket.connected) {
            unitOwnerSocket.emit("gamestate unit", unit);
        }
        console.log(`DEBUG: Added resources to unit ${data.targetId}. New resources:`, unit.resources);
      } else {
        console.warn(`DEBUG: Unit ${data.targetId} not found for adding resources.`);
      }
    } else {
      console.warn(`DEBUG: Invalid target type ${getSelectionTypeName(data.targetType)} for adding resources.`);
    }
  }

  private handleDebugSpawnBuilding(socket: Socket, data: { buildingKey: string; position: Hex }) {
    const uid = this.getPlayerUid(socket.id);
    if (!uid) {
      console.warn("DebugSpawnBuilding: UID not found for socket.");
      return;
    }

    const { buildingKey, position } = data;

    // Check if building template exists
    if (!(Buildings as any)[buildingKey]) {
        console.warn(`DEBUG: Building template key "${buildingKey}" not found.`);
        return;
    }

    console.log(`DEBUG: Player ${uid} requested to spawn building ${buildingKey} at H[${position.q},${position.r}]`);

    // Use the existing createBuilding function
    // For debug, we might want to spawn it for the requesting player, or a default/neutral owner.
    // Assuming the debug action means the current player (UID from socket) owns it.
    const newBuilding = createBuilding(++this.world.idCounter, uid, buildingKey, position);
    
    if (newBuilding) {
      this.world.buildings[newBuilding.id] = newBuilding;
      console.log(`DEBUG: Spawned building with key ${newBuilding.key} (ID: ${newBuilding.id}) for player ${uid} at H[${position.q},${position.r}]`);
      
      // Update visibility for the owner
      this.updatePlayerVisibilities(uid);
      
      // Send an update for the new building to the owner
      // The general updateNet will also broadcast it to other relevant players.
      socket.emit("gamestate building", newBuilding);

      // It might also be good to send an update for the tile if the building changes tile properties implicitly
      // For now, just sending the building update.
    } else {
      console.warn(`DEBUG: Failed to create building ${buildingKey} for player ${uid}.`);
    }
  }

  private handleDebugSpawnUnit(socket: Socket, data: { position: Hex }) {
    const uid = this.getPlayerUid(socket.id);
    if (!uid) {
      console.warn("DebugSpawnUnit: UID not found for socket.");
      return;
    }

    const { position } = data;
    console.log(`DEBUG: Player ${uid} requested to spawn generic unit at H[${position.q},${position.r}]`);

    // Use the existing createUnit function. 
    // The default name "Unit" is used as per createUnit's current implementation.
    // It will be owned by the requesting player (uid).
    const newUnit = createUnit(++this.world.idCounter, uid, position);

    if (newUnit) {
      this.world.units[newUnit.id] = newUnit;
      console.log(`DEBUG: Spawned unit ${newUnit.name} (ID: ${newUnit.id}) for player ${uid} at H[${position.q},${position.r}]`);
      
      // Update visibility for the owner
      this.updatePlayerVisibilities(uid);

      // Send an update for the new unit to the owner
      // The general updateNet will also broadcast it to other relevant players.
      socket.emit("gamestate unit", newUnit);
    } else {
      console.warn(`DEBUG: Failed to create generic unit for player ${uid}.`);
    }
  }

  private getPlayerUid(socketId): string | null {
    const player: Player = this.getPlayerBySocketId(socketId)
    if (player) {
      return player.uid
    }
    return null
  }

  private getPlayerBySocketId(socketId: string): Player {
    return this.socketplayer[socketId]
  }

  private getPlayerByUid(uid: string): Player | null {
    return this.world.players[uid]
  }

  /**
   * Updates the player.discoveredHexes and player.visible Call this method after something happens, that affects visibilities (movement, upgrades, deaths...)
   * @param uid player id
   */
  private updatePlayerVisibilities(uid: string) {
    const player = this.getPlayerByUid(uid)
    if (!player) {
      return
    }
    player.visibleHexes = []

    if (player) {
      Object.values(this.world.units).forEach((unit) => {
        if (unit.owner === uid) {
          let visible = neighborsRange(unit.pos, unit.spotting)
          this.addUniqueHexes(player.visibleHexes, visible)
          this.addUniqueHexes(player.discoveredHexes, visible)
        }
      })
      Object.values(this.world.buildings).forEach((building) => {
        if (building.owner === uid) {
          let visible = neighborsRange(building.position, building.spotting)
          this.addUniqueHexes(player.visibleHexes, visible)
          this.addUniqueHexes(player.discoveredHexes, visible)
        }
      })
    }
  }

  private addUniqueHexes(hexarray: Hex[], newHexes: Hex[]) {
    for (let nHex of newHexes) {
      let found = false
      for (let h of hexarray) {
        if (equals(nHex, h)) {
          found = true
        }
      }
      if (!found) {
        hexarray.push(nHex)
      }
    }
  }

  private getTiles(hexes: Hex[]): Hashtable<Tile> {
    let result: Hashtable<Tile> = {}
    for (let hex of hexes) {
      result[hash(hex)] = this.world.tiles[hash(hex)]
    }
    return result
  }

  private getVisibleUnits(hexes: Hex[]): Hashtable<Unit> {
    let result: Hashtable<Unit> = {}
    for (let hex of hexes) {
      Object.values(this.world.units).forEach((unit) => {
        if (equals(unit.pos, hex)) result[unit.id] = unit
      })
    }
    return result
  }
  private getVisibleBattles(hexes: Hex[]): Battle[] {
    let result: Battle[] = []
    for (let hex of hexes) {
      for (let battle of this.world.battles) {
        if (equals(battle.position, hex)) result.push(battle)
      }
    }
    return result
  }

  private getVisibleBuildings(hexes: Hex[]): Building[] {
    let result: Building[] = []
    for (let hex of hexes) {
      Object.values(this.world.buildings).forEach((building) => {
        if (equals(building.position, hex)) result.push(building)
      })
    }
    return result
  }

  /**
   * Checks if a player can build a building at a tile
   * @param tile Tile
   * @param uid Player uid
   * @param name of building
   */
  private isAllowedToBuild(tile: Tile, uid: string, type: string): boolean {
    let object = Buildings[type] as TBuildingTemplate
    if (!object) {
      console.warn(`Building '${type}' not found`)
      return false
    }

    // Check if there are already 3 buildings on this tile
    if (this.countBuildingsOnTile(tile.hex) >= 3) {
      console.debug(`Cannot build more than 3 buildings on a single tile`)
      return false
    }

    return (
      this.hasResources(tile, object.cost) && this.hasPresence(tile.hex, uid)
    )
  }

  /**
   * Counts the number of buildings on a specific tile
   * @param pos Hex position
   * @returns Number of buildings on the tile
   */
  private countBuildingsOnTile(pos: Hex): number {
    let count = 0
    Object.values(this.world.buildings).forEach((building) => {
      if (equals(building.position, pos)) {
        count++
      }
    })
    return count
  }

  /**
   * Returns true if uid has unit at pos
   * @param pos
   * @param uid
   */
  private hasUnitAt(pos: Hex, uid: string): boolean {
    let found = false
    Object.values(this.world.units).forEach((unit) => {
      if (equals(unit.pos, pos) && unit.owner === uid) {
        found = true
      }
    })
    return found
  }

  /**
   * Returns true if uid has building at pos
   * @param pos
   * @param uid
   */
  private hasBuildingAt(pos: Hex, uid: string): boolean {
    let found = false
    Object.values(this.world.buildings).forEach((building) => {
      if (equals(building.position, pos) && building.owner === uid) {
        found = true
      }
    })
    return found
  }

  /**
   * Returns true if uid has unit or building at pos
   * @param pos
   * @param uid
   */
  private hasPresence(pos: Hex, uid: string): boolean {
    return this.hasUnitAt(pos, uid) || this.hasBuildingAt(pos, uid)
  }

  /**
   * Checks if the object (building or unit) can be created on tile
   * @param tile
   * @param object
   */
  private hasResources(tile: Tile, cost: Partial<Resources>): boolean {
    for (let resource of Object.keys(cost)) {
      if (
        !tile.resources[resource] ||
        tile.resources[resource] < cost[resource]
      ) {
        return false
      }
    }
    return true
  }

  /**
   * @returns a random hex that is not in a water or other extreme biome
   */
  private getRandomSpawnHex(attempt: number = 0): Hex {
    const MAX_ATTEMPTS = 100; // Define a constant for max attempts
    if (attempt >= MAX_ATTEMPTS) {
        console.error(`Exceeded maximum attempts (${MAX_ATTEMPTS}) to find a suitable spawn hex.`);
        throw new Error(`Could not find a suitable spawn hex after ${MAX_ATTEMPTS} attempts.`);
    }

    const hashes = Object.keys(this.world.tiles);

    if (hashes.length === 0) {
      console.error("No tiles available in the world to select a random spawn hex.");
      throw new Error("Cannot select a random spawn hex: world has no tiles.");
    }

    const index = Math.floor(Math.random() * hashes.length);
    const tileKey = hashes[index];
    const tile = this.world.tiles[tileKey];

    if (!tile) {
      // This scenario should ideally not happen if hashes.length > 0 and index is valid.
      // It might indicate a data integrity issue.
      console.warn(`Tile not found for key '${tileKey}' in getRandomSpawnHex (attempt ${attempt + 1}). Retrying.`);
      return this.getRandomSpawnHex(attempt + 1);
    }

    switch (tile.biome) {
      case Biome.Ocean:
      case Biome.River:
      case Biome.Shore:
      case Biome.Beach:
      case Biome.Desert:
      case Biome.Ice:
      case Biome.Mountain:
        return this.getRandomSpawnHex(attempt + 1);
    }
    return tile.hex;
  }

  public setWorld(world: World) {
    this.world = world
    this.updateNet(1)
  }

  onRequestDisband(socket: Socket, data) {
    let uid = this.getPlayerUid(socket.id)
    const unitToDisband = this.world.units[data.unitId]
    if (unitToDisband.owner !== uid) {
      console.warn(`Player '${uid}' tried to disband unit that they don't own`)
      return
    }

    if (unitToDisband) {
      delete this.world.units[unitToDisband.id]
      this.updatePlayerVisibilities(uid)
    }
  }

  /**
   * Handle request to change relation with another player
   */
  onRequestChangeRelation(socket: Socket, data: { targetPlayerId: string, relationType: EnumRelationType }) {
    const uid = this.getPlayerUid(socket.id)
    if (!uid) return
    
    const { targetPlayerId, relationType } = data
    
    // Validate relation type
    if (!Object.values(EnumRelationType).includes(relationType)) {
      console.warn(`Invalid relation type: ${relationType}`)
      return
    }
    
    // Can't change relation with yourself
    if (uid === targetPlayerId) {
      console.warn(`Player ${uid} tried to change relation with self`)
      return
    }
    
    // Create or update the relation
    const hash = PlayerRelation.hash(uid, targetPlayerId)
    let playerRelation = this.world.playerRelations[hash]
    
    if (!playerRelation) {
      playerRelation = PlayerRelation.create(uid, targetPlayerId, relationType)
      this.world.playerRelations[hash] = playerRelation
    } else {
      playerRelation.relationType = relationType
    }
    
    // Notify both players
    socket.emit("gamestate relation", playerRelation)
    
    // Notify the other player
    const otherPlayerSocket = this.uidsockets[targetPlayerId]
    if (otherPlayerSocket && otherPlayerSocket.connected) {
      otherPlayerSocket.emit("gamestate relation", playerRelation)
    }
    
    console.log(`Player ${uid} changed relation with ${targetPlayerId} to ${EnumRelationType[relationType]}`)
  }
}

function calculateMovementProgress(
  _unit: Unit,
  _currentTile: Tile,
  _nextTile: Tile
) {
  //TODO: calculate
  return 100
}
// public updateMovementFactor() {
//   //TODO calculate correct movementcost
//   let movementFactor = 1

//   if (this.height >= Rules.settings.map_level_stone) {
//     movementFactor -= 0.3 //Its cold
//   }

//   if (this.forestation > 0.7) {
//     movementFactor -= 0.4 //You're in a forest
//   }

//   if (this.height < Rules.settings.map_level_water_deep) {
//     movementFactor = 0.01 //You're now swimming
//   } else if (this.height < Rules.settings.map_level_water_shallow) {
//     movementFactor = 0.1 //You're wading
//   }

//   // movementFactor -= this.environmentSpots.length*0.05;

//   this.movementFactor = Math.min(1, Math.max(0.01, movementFactor))
// }
