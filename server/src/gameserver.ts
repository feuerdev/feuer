import Buildings from "../../shared/templates/buildings.json" with { type: "json" };
import { astar } from "../../shared/pathfinding.js"
import { Socket } from "socket.io"
import { Hashtable } from "../../shared/util.js"
import {
  Building,
  Group,
  World,
  Tile,
  Biome,
  TBuildingTemplate,
  Battle,
  Injury,
  InjurySeverity,
  InjuryEffect,
  GroupBehavior,
} from "../../shared/objects.js"
import * as PlayerRelation from "../../shared/relation.js"
import * as Battles from "./battle.js"
import { createGroup } from "./group.js"
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
import Rules from "../../shared/rules.json" with { type: "json" }

// Helper function to get effective stats after applying injury effects
function getEffectiveStats(group: Group, currentTick: number): Partial<Group> {
  const effectiveStats: Partial<Group> = { ...group }; // Start with base stats

  // Create a mutable copy of stats that can be modified
  let modifiableStats = {
    strength: group.strength,
    agility: group.agility,
    initiative: group.initiative,
    morale: group.morale,
    // Add other stats here if injuries can affect them
  };

  group.injuries.forEach(injury => {
    injury.effects.forEach(effect => {
      // Check if the injury is still active (if it has a duration)
      if (effect.duration === undefined || (group.injuries.find(inj => inj.id === injury.id) && injury.timeOfInjury + effect.duration > currentTick)) {
        switch (effect.effect) {
          case InjuryEffect.StrengthDecrease:
            modifiableStats.strength = Math.max(0, modifiableStats.strength - effect.magnitude);
            break;
          case InjuryEffect.AgilityDecrease:
            modifiableStats.agility = Math.max(0, modifiableStats.agility - effect.magnitude);
            break;
          case InjuryEffect.InitiativeDecrease:
            modifiableStats.initiative = Math.max(0, modifiableStats.initiative - effect.magnitude);
            break;
          case InjuryEffect.MoraleDecrease: // Directly affect morale for now
            modifiableStats.morale = Math.max(0, modifiableStats.morale - effect.magnitude);
            break;
          // Add cases for other InjuryEffects if necessary
        }
      }
    });
  });

  // Update effectiveStats with the modified values
  effectiveStats.strength = modifiableStats.strength;
  effectiveStats.agility = modifiableStats.agility;
  effectiveStats.initiative = modifiableStats.initiative;
  effectiveStats.morale = modifiableStats.morale;
  
  return effectiveStats;
}

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
      let dbgStart = Date.now()
      this.update(this.updaterate / this.defaultDelta)
      let dbgAfterUpdate = Date.now()
      this.updateNet(this.updaterate / this.defaultDelta)
      let dbgAfterSend = Date.now()
      if (
        this.actualTicks > 5 &&
        Math.abs(timeSincelastFrame - this.updaterate) > 30
      ) {
        console.warn("Warning something is fucky with the gameloop")
      }
      // console.debug(
      //   "Update took:" +
      //     (dbgAfterUpdate - dbgStart) +
      //     " Sending Data to clients took:" +
      //     (dbgAfterSend - dbgAfterUpdate) +
      //     " Time since last Frame:" +
      //     timeSincelastFrame +
      //     " Gesamtticks:" +
      //     this.actualTicks +
      //     " Abweichung:" +
      //     (timeSincelastFrame - this.updaterate)
      // )
    }
    setInterval(gameloop, this.updaterate)
  }

  resume() {
    console.info("Game resumed")
    this.run()
  }

  //Loops
  update(deltaFactor: number) {
    //Group Movement
    Object.values(this.world.groups).forEach((group) => {
      if (group.targetHexes.length > 0) {
        const currentTile = this.world.tiles[hash(group.pos)]
        const nextHex = group.targetHexes[0]

        if (!nextHex || !currentTile) return

        const nextTile = this.world.tiles[hash(nextHex)]

        if (!nextTile) return

        group.movementStatus +=
          calculateMovementProgress(group, currentTile, nextTile) * deltaFactor
        if (group.movementStatus > 100) {
          group.pos = group.targetHexes.splice(0, 1)[0]!
          group.movementStatus = 0
          this.updatePlayerVisibilities(group.owner)
          this.checkForBattle(group)
          this.tryJoinOngoingBattle(group);
        }
      }
      
      // Process healing of injuries
      this.processGroupHealing(group);
    })

    //Resource Gathering
    Object.values(this.world.buildings).forEach((building) => {
      let tile = this.world.tiles[hash(building.position)]
      
      // Handle resource generation from assigned groups
      building.slots.forEach((slot, slotIndex) => {
        if (slot.assignedGroupId) {
          const assignedGroup = this.world.groups[slot.assignedGroupId]
          
          // Skip if group no longer exists or has been moved away from building
          if (!assignedGroup || !equals(assignedGroup.pos, building.position)) {
            // Clear the assignment
            slot.assignedGroupId = undefined
            return
          }
          
          // Get the resource type for this slot
          const resourceType = slot.resourceType
          
          // Calculate resource generation based on:
          // 1. Slot efficiency
          // 2. Group's gathering efficiency for this resource type
          
          // Get group's efficiency for this resource category
          let groupEfficiency = 1.0
          if (resourceType === 'wood') {
            groupEfficiency = assignedGroup.gatheringEfficiency.wood
          } else if (resourceType === 'stone') {
            groupEfficiency = assignedGroup.gatheringEfficiency.stone
          } else if (resourceType === 'iron') {
            groupEfficiency = assignedGroup.gatheringEfficiency.iron
          } else if (resourceType === 'gold') {
            groupEfficiency = assignedGroup.gatheringEfficiency.gold
          } else if (['fish', 'wheat', 'meat', 'berries'].includes(resourceType)) {
            groupEfficiency = assignedGroup.gatheringEfficiency.food
          }
          
          // Calculate final production rate
          const productionRate = slot.efficiency * groupEfficiency * /*resourceAvailabilityFactor * */ deltaFactor
          
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

      // Simplified battle resolution
      this.resolveBattle(battle)
      
      // Check if battle is over
      if (this.isBattleOver(battle)) {
        this.finishBattle(battle)
      }
    }
  }

  /**
   * Simple battle resolution between two groups
   */
  resolveBattle(battle: Battle): void {
    // Special handling for tile defense battles
    if (battle.isTileDefenseBattle) {
      this.resolveTileDefenseBattle(battle);
      return;
    }
    
    // Regular battle logic (existing code)
    // Check for immediate flee behaviors
    if (battle.attacker.behavior === GroupBehavior.FleeIfAttacked) {
      console.log(`Group ${battle.attacker.id} (Attacker) has FleeIfAttacked behavior and attempts to flee immediately.`);
      battle.attacker.morale = 1; // Mark as fled
      // Battle might end here if defender doesn't need to act, or could give defender a free hit (not implemented)
      return; // Attacker flees, resolveBattle might terminate or be re-evaluated after this group is handled
    }
    if (battle.defender.behavior === GroupBehavior.FleeIfAttacked) {
      console.log(`Group ${battle.defender.id} (Defender) has FleeIfAttacked behavior and attempts to flee immediately.`);
      battle.defender.morale = 1; // Mark as fled
      return; // Defender flees
    }

    // Get effective stats for attacker and defender
    const effectiveAttackerStats = getEffectiveStats(battle.attacker, this.actualTicks);
    const effectiveDefenderStats = getEffectiveStats(battle.defender, this.actualTicks);

    const attackerStrengthFactor = 1 + ((effectiveAttackerStats.strength ?? battle.attacker.strength) - 50) / 100;
    const attackerAgilityFactor = 1 + ((effectiveAttackerStats.agility ?? battle.attacker.agility) - 5) / 20; 
    const defenderStrengthFactor = 1 + ((effectiveDefenderStats.strength ?? battle.defender.strength) - 50) / 100;
    const defenderAgilityFactor = 1 + ((effectiveDefenderStats.agility ?? battle.defender.agility) - 5) / 20;

    const attackerEffectiveAttack = (effectiveAttackerStats.attack ?? battle.attacker.attack) * attackerStrengthFactor * ((effectiveAttackerStats.morale ?? battle.attacker.morale) / 100);
    const defenderEffectiveDefense = (effectiveDefenderStats.defense ?? battle.defender.defense) * defenderStrengthFactor * ((effectiveDefenderStats.morale ?? battle.defender.morale) / 100);
    
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

    // Update group stats with the new morale values from effective stats (which included injury effects)
    // This ensures the core group object reflects the post-injury, post-damage morale for flee checks
    battle.attacker.morale = effectiveAttackerStats.morale ?? battle.attacker.morale;
    battle.defender.morale = effectiveDefenderStats.morale ?? battle.defender.morale;

    // Chance to inflict injuries based on damage taken and pain threshold
    this.applyInjuryChance(battle.attacker, finalDefenderDamage);
    this.applyInjuryChance(battle.defender, finalAttackerDamage);

    // Check for fleeing conditions (e.g., morale < 10%)
    const FLEE_THRESHOLD = 10;
    let attackerFled = false;
    let defenderFled = false;

    if (battle.attacker.morale < FLEE_THRESHOLD && battle.attacker.morale > 0) { // Must have some morale to decide to flee
      // Attacker attempts to flee. For now, auto-success.
      console.log(`Group ${battle.attacker.id} attempts to flee!`);
      // TODO: Implement flee success chance based on agility, terrain, etc.
      // TODO: Mark group as fleeing, potentially move it to an adjacent tile.
      attackerFled = true;
      // For now, if flee, their morale is set to a very low non-zero value to signify they survived but fled.
      battle.attacker.morale = 1;
    }

    if (!attackerFled && battle.defender.morale < FLEE_THRESHOLD && battle.defender.morale > 0) {
      // Defender attempts to flee if attacker didn't already cause battle to end.
      console.log(`Group ${battle.defender.id} attempts to flee!`);
      defenderFled = true;
      battle.defender.morale = 1;
    }

    // If either side fled, the battle might conclude differently or enter a pursuit phase (not implemented)
    // For now, if someone flees, we consider the battle over for them.
    // The isBattleOver check will handle if the other side is also at 0 morale.
    if (attackerFled || defenderFled) {
      console.log("A group has fled the battle.");
      // The finishBattle logic will remove groups with 0 morale.
      // Fleeing groups (morale 1) will remain for now.
    }
  }
  
  /**
   * Resolves a battle between a group and tile defenses
   */
  resolveTileDefenseBattle(battle: Battle): void {
    if (!battle.isTileDefenseBattle || !battle.defensiveBuildings) {
      return;
    }
    
    // Get the attacker (the real group)
    const attacker = battle.attacker;
    
    // Virtual defender represents the defensive buildings
    const defender = battle.defender;
    
    // Calculate effective attack based on attacker's stats
    const effectiveAttackerStats = getEffectiveStats(attacker, this.actualTicks);
    
    const attackerStrengthFactor = 1 + ((effectiveAttackerStats.strength ?? attacker.strength) - 50) / 100;
    const attackerEffectiveAttack = (effectiveAttackerStats.attack ?? attacker.attack) * 
                                   attackerStrengthFactor * 
                                   ((effectiveAttackerStats.morale ?? attacker.morale) / 100);
    
    // Get the total defense value from all defensive buildings
    const totalDefense = battle.defensiveBuildings.reduce((sum, building) => sum + (building.defense || 0), 0);
    
    // Buildings deal less damage to groups than groups do to each other
    const defenderEffectiveAttack = totalDefense * 0.5;
    
    // Calculate damage
    // Buildings are less affected by group attacks (representing their durability)
    const attackerDamage = Math.max(0, attackerEffectiveAttack - totalDefense * 0.7) * 0.5;
    
    // Buildings deal consistent damage to attackers
    const defenderDamage = Math.max(0, defenderEffectiveAttack - attacker.defense * 0.3);
    
    // Apply damage
    defender.morale = Math.max(0, defender.morale - attackerDamage);
    attacker.morale = Math.max(0, attacker.morale - defenderDamage);
    
    // Apply injuries to the attacker (buildings don't get injured)
    this.applyInjuryChance(attacker, defenderDamage);
    
    // Check if attacker flees
    const FLEE_THRESHOLD = 10;
    if (attacker.morale < FLEE_THRESHOLD && attacker.morale > 0) {
      console.log(`Group ${attacker.id} attempts to flee from tile defenses!`);
      attacker.morale = 1; // Mark as fled
    }
    
    // Update the virtual defender to reflect battle progress
    battle.defender = defender;
  }
  
  /**
   * Check if a battle is over (one side has 0 morale)
   */
  isBattleOver(battle: Battle): boolean {
    if (battle.isTileDefenseBattle) {
      // Tile defense battles end when either:
      // 1. The attacker's morale is 0 (attacker is defeated)
      // 2. The defender's morale (representing building health) is 0 (buildings destroyed)
      // 3. The attacker has fled (morale = 1)
      return battle.attacker.morale <= 0 || battle.defender.morale <= 0 || battle.attacker.morale === 1;
    }
    
    // Regular battles end when either participant has 0 morale
    return battle.attacker.morale <= 0 || battle.defender.morale <= 0;
  }

  finishBattle(battle: Battle) {
    if (battle.isTileDefenseBattle) {
      this.finishTileDefenseBattle(battle);
      return;
    }
    
    // Regular battle resolution
    // If attacker lost, remove them
    if (battle.attacker.morale <= 0) {
      delete this.world.groups[battle.attacker.id];
    }
    
    // If defender lost, remove them
    if (battle.defender.morale <= 0) {
      delete this.world.groups[battle.defender.id];
    }
    
    // Remove battle from the list
    this.world.battles.splice(this.world.battles.indexOf(battle), 1);
    
    // Update visibilities
    this.updatePlayerVisibilities(battle.attacker.owner);
    this.updatePlayerVisibilities(battle.defender.owner);
  }
  
  /**
   * Finishes a tile defense battle and handles the consequences
   */
  finishTileDefenseBattle(battle: Battle): void {
    if (!battle.isTileDefenseBattle || !battle.defensiveBuildings || !battle.defenseOwner) {
      return;
    }
    
    // If attacker won (defender's morale <= 0), destroy defensive buildings
    if (battle.defender.morale <= 0) {
      console.log(`Group ${battle.attacker.id} destroyed defensive buildings on tile ${hash(battle.position)}`);
      
      // Find and remove all defensive buildings of this owner on the tile
      battle.defensiveBuildings.forEach(building => {
        delete this.world.buildings[building.id];
      });
      
      // Notify the building owner
      const socket = this.uidsockets[battle.defenseOwner];
      if (socket && socket.connected) {
        socket.emit("notification", {
          type: "buildings-destroyed",
          message: `Your defensive buildings on a tile were destroyed by an enemy group!`,
          position: battle.position
        });
      }
    }
    
    // If attacker lost (attacker's morale <= 0), remove them
    if (battle.attacker.morale <= 0) {
      delete this.world.groups[battle.attacker.id];
      
      // Notify the defense owner of their success
      const socket = this.uidsockets[battle.defenseOwner];
      if (socket && socket.connected) {
        socket.emit("notification", {
          type: "defense-success",
          message: `Your defensive buildings successfully repelled an enemy attack!`,
          position: battle.position
        });
      }
    }
    
    // Remove the battle
    this.world.battles.splice(this.world.battles.indexOf(battle), 1);
    
    // Update visibilities
    this.updatePlayerVisibilities(battle.attacker.owner);
    this.updatePlayerVisibilities(battle.defenseOwner);
  }

  checkForBattle(group: Group) {
    // First check if this group is attacking a defended tile
    if (this.checkForTileDefense(group)) {
      // If a tile defense battle was initiated, don't check for group battles
      return;
    }
    
    // Continue with normal group vs group battle checks
    Object.values(this.world.groups).forEach((otherGroup) => {
      if (
        equals(group.pos, otherGroup.pos) &&
        group.owner !== otherGroup.owner &&
        group.id !== otherGroup.id &&
        !this.world.battles.find(b => 
          (b.attacker.id === group.id && b.defender.id === otherGroup.id) ||
          (b.defender.id === group.id && b.attacker.id === otherGroup.id) ||
          // Also check if the otherGroup is already in ANY battle on this tile, to avoid multiple 1v1s for same pair
          ( (b.attacker.id === otherGroup.id || b.defender.id === otherGroup.id) && equals(b.position, group.pos) )
        )
      ) {
        // Check relation and behaviors
        const relation =
          this.world.playerRelations[
            PlayerRelation.hash(group.owner, otherGroup.owner)
          ];
        const areHostile = !relation || relation.relationType === PlayerRelation.EnumRelationType.hostile;

        if (areHostile && 
            (group.behavior === GroupBehavior.Aggressive || otherGroup.behavior === GroupBehavior.Aggressive)
        ) {
          this.world.battles.push(
            Battles.create(++this.world.idCounter, group.pos, group, otherGroup)
          );
          console.log(`New battle initiated between ${group.id} and ${otherGroup.id} due to aggressive behavior.`);
        }
      }
    })
  }

  /**
   * Checks if a group is entering a tile that has defensive buildings
   * owned by another player, and initiates a defense battle if appropriate
   * @param group The group potentially attacking a defended tile
   * @returns true if a tile defense battle was initiated, false otherwise
   */
  checkForTileDefense(group: Group): boolean {
    // Skip if the group isn't aggressive
    if (group.behavior !== GroupBehavior.Aggressive) {
      return false;
    }
    
    const tile = this.world.tiles[hash(group.pos)];
    if (!tile) return false;
    
    // Get all defensive buildings on this tile
    const defensiveBuildings = Object.values(this.world.buildings).filter(building => 
      equals(building.position, group.pos) && 
      building.owner !== group.owner && 
      building.isDefensive
    );
    
    if (defensiveBuildings.length === 0) {
      return false; // No defensive buildings to fight against
    }
    
    // Group defensive buildings by owner
    const buildingsByOwner: Record<string, Building[]> = {};
    defensiveBuildings.forEach(building => {
      if (!buildingsByOwner[building.owner]) {
        buildingsByOwner[building.owner] = [];
      }
      buildingsByOwner[building.owner].push(building);
    });
    
    // For each owner, check if we should initiate a battle against their defenses
    for (const [ownerKey, buildings] of Object.entries(buildingsByOwner)) {
      // Check relationship with the owner
      const relation = this.world.playerRelations[
        PlayerRelation.hash(group.owner, ownerKey)
      ];
      
      const areHostile = !relation || relation.relationType === PlayerRelation.EnumRelationType.hostile;
      
      if (areHostile) {
        // Check if there's already a group vs. tile battle for this group
        const existingBattle = this.world.battles.find(b => 
          b.attacker.id === group.id && 
          b.isTileDefenseBattle && 
          equals(b.position, group.pos) &&
          b.defenseOwner === ownerKey
        );
        
        if (!existingBattle) {
          // Create a virtual defender for the buildings
          // Calculate total defense value from all buildings
          const totalDefense = buildings.reduce((sum, building) => sum + (building.defense || 0), 0);
          
          // Create a new battle with special properties
          const battle: Battle = {
            id: ++this.world.idCounter,
            attacker: group,
            defender: this.createVirtualDefender(ownerKey, totalDefense),
            position: group.pos,
            isTileDefenseBattle: true,
            defenseOwner: ownerKey,
            defensiveBuildings: buildings
          };
          
          this.world.battles.push(battle);
          console.log(`Tile defense battle initiated with group ${group.id} attacking ${buildings.length} defensive buildings owned by ${ownerKey}`);
          
          return true; // Battle initiated
        }
      }
    }
    
    return false;
  }
  
  /**
   * Creates a virtual defender group for tile defense battles
   */
  createVirtualDefender(owner: string, defenseValue: number): Group {
    // Create a simple virtual group with properties based on defense value
    return {
      id: -1, // Negative ID to indicate it's virtual
      owner: owner,
      name: "Tile Defense",
      spotting: 0,
      targetHexes: [],
      pos: create(0, 0, 0), // Will be updated by the battle
      movementStatus: 0,
      resources: {},
      morale: 100,
      strength: defenseValue,
      endurance: defenseValue,
      attack: defenseValue / 2,
      defense: defenseValue,
      initiative: 1,
      agility: 1,
      painThreshold: 100, // High pain threshold as buildings don't feel pain
      intelligence: 1,
      injuries: [],
      groupType: "Virtual",
      behavior: GroupBehavior.Defensive,
      gatheringEfficiency: {
        wood: 0,
        stone: 0,
        food: 0,
        iron: 0,
        gold: 0
      },
      isVirtual: true
    };
  }

  tryJoinOngoingBattle(group: Group) {
    // Find battles on the current tile
    const battlesOnTile = this.world.battles.filter(b => equals(b.position, group.pos));

    for (const battle of battlesOnTile) {
      // Can't join your own battle or if you are already part of this battle
      if (battle.attacker.id === group.id || battle.defender.id === group.id) continue;

      const playerRelationWithAttacker = this.world.playerRelations[PlayerRelation.hash(group.owner, battle.attacker.owner)];
      const hostileToAttacker = !playerRelationWithAttacker || playerRelationWithAttacker.relationType === PlayerRelation.EnumRelationType.hostile;

      // Scenario 1: Original defender was defeated (morale 0), and new group is hostile to attacker
      if (battle.defender.morale <= 0 && hostileToAttacker && battle.attacker.morale > 0) {
        console.log(`Group ${group.id} joins ongoing battle against attacker ${battle.attacker.id}`);
        battle.defender = group; // New group becomes the defender
        // Optionally reset attacker's state if needed, or let combat continue
        this.updatePlayerVisibilities(group.owner); 
        this.updatePlayerVisibilities(battle.attacker.owner);
        return; // Joined one battle, that's enough for this movement tick
      }

      // Scenario 2: Original attacker was defeated (morale 0), and new group is hostile to defender
      // This is less common if battles are removed quickly, but included for completeness
      const playerRelationWithDefender = this.world.playerRelations[PlayerRelation.hash(group.owner, battle.defender.owner)];
      const hostileToDefender = !playerRelationWithDefender || playerRelationWithDefender.relationType === PlayerRelation.EnumRelationType.hostile;
      if (battle.attacker.morale <= 0 && hostileToDefender && battle.defender.morale > 0) {
        console.log(`Group ${group.id} joins ongoing battle against defender ${battle.defender.id}`);
        battle.attacker = group; // New group becomes the attacker
        this.updatePlayerVisibilities(group.owner);
        this.updatePlayerVisibilities(battle.defender.owner);
        return; 
      }
    }

    // If no existing battle to join, check for multiple hostile groups on the tile
    // This is our new multi-group battle system
    this.checkForMultiGroupBattle(group);
  }

  /**
   * Checks for multiple hostile groups on a tile and creates appropriate battles
   * between them, implementing a more complex battle system than simple 1v1
   */
  checkForMultiGroupBattle(group: Group) {
    // If the group is already in a battle, don't start a new one
    if (this.world.battles.some(b => 
      (b.attacker.id === group.id || b.defender.id === group.id) && 
      equals(b.position, group.pos))
    ) {
      return;
    }

    // Find all other groups on this tile
    const groupsOnTile = Object.values(this.world.groups).filter(g => 
      g.id !== group.id && equals(g.pos, group.pos)
    );

    if (groupsOnTile.length === 0) return; // No other groups on this tile

    // Group hostile groups by owner for more organized battles
    const hostileGroupsByOwner: Record<string, Group[]> = {};

    // Check which groups are hostile to the current group
    groupsOnTile.forEach(otherGroup => {
      const relation = this.world.playerRelations[
        PlayerRelation.hash(group.owner, otherGroup.owner)
      ];
      const areHostile = !relation || relation.relationType === PlayerRelation.EnumRelationType.hostile;
      
      // Only consider hostile groups where at least one has aggressive behavior
      if (areHostile && (group.behavior === GroupBehavior.Aggressive || otherGroup.behavior === GroupBehavior.Aggressive)) {
        // Group by owner to organize battles
        if (!hostileGroupsByOwner[otherGroup.owner]) {
          hostileGroupsByOwner[otherGroup.owner] = [];
        }
        hostileGroupsByOwner[otherGroup.owner].push(otherGroup);
      }
    });

    // If no hostile groups, no battles to create
    if (Object.keys(hostileGroupsByOwner).length === 0) return;

    // Now match this group against hostile groups in a way that distributes the battles
    let battleCreated = false;

    // First, check if any player has multiple groups that can team up
    for (const [ownerKey, hostileGroups] of Object.entries(hostileGroupsByOwner)) {
      if (hostileGroups.length > 0) {
        // Sort hostile groups by strength to prioritize stronger opponents
        hostileGroups.sort((a, b) => b.strength - a.strength);
        
        // Create a battle with the strongest hostile group
        const opponent = hostileGroups[0];
        
        // Determine who attacks and who defends based on initiative
        let attacker: Group, defender: Group;
        if (group.initiative > opponent.initiative) {
          attacker = group;
          defender = opponent;
        } else {
          attacker = opponent;
          defender = group;
        }
        
        this.world.battles.push(
          Battles.create(++this.world.idCounter, group.pos, attacker, defender)
        );
        
        console.log(`Multi-group battle initiated between ${attacker.id} and ${defender.id}`);
        battleCreated = true;
        
        // For now, just create one battle per movement tick to keep things manageable
        // In the future, this could be expanded to create multiple battles
        break;
      }
    }

    if (battleCreated) {
      // Update visibilities for all involved players
      this.updatePlayerVisibilities(group.owner);
      Object.keys(hostileGroupsByOwner).forEach(owner => {
        this.updatePlayerVisibilities(owner);
      });
    }
  }

  updateNet(_delta) {
    for (let player of Object.values(this.world.players)) {
      if (player.initialized) {
        const socket: Socket = this.uidsockets[player.uid]
        if (socket && socket.connected) {
          let groups = this.getVisibleGroups(player.visibleHexes)
          let battles = this.getVisibleBattles(player.visibleHexes)
          let buildings = this.getVisibleBuildings(player.visibleHexes)
          socket.emit("gamestate groups", groups)
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

      // Create initial group
      let initialGroup = createGroup(++this.world.idCounter, player.uid, "Group", pos)
      this.world.groups[initialGroup.id] = initialGroup

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
    socket.on("request group", (id: number) => this.onRequestGroup(socket, id))
    socket.on("request movement", (data) => this.onRequestMovement(socket, data))
    socket.on("request construction", (data) => this.onRequestConstruction(socket, data))
    socket.on("request relation", (data) => this.onRequestRelation(socket, data))
    socket.on("request disband", (data) => this.onRequestDisband(socket, data))
    socket.on("request transfer", (data) => this.onRequestTransfer(socket, data))
    socket.on("request demolish", (data) => this.onRequestDemolish(socket, data))
    socket.on("request assign group", (data) => this.onRequestAssignGroup(socket, data))
    socket.on("request unassign group", (data) => this.onRequestUnassignGroup(socket, data))
    socket.on("request upgrade building", (data) => this.onRequestUpgradeBuilding(socket, data))
    socket.on("request hire group", (data) => this.onRequestHireGroup(socket, data))
    socket.on("request set group behavior", (data) => this.onRequestSetGroupBehavior(socket, data));
  }

  onRequestTiles(socket: Socket, data: Hex[]) {
    const player: Player = this.socketplayer[socket.id]
    if (player) {
      //TODO: Check if player has permission to see these tiles
      socket.emit("gamestate tiles", this.getTiles(data || player.discoveredHexes))
    }
  }

  /**
   * Currently only used to request an update for your own group
   */
  onRequestGroup(socket: Socket, data: number) {
    const player: Player = this.socketplayer[socket.id]
    const group = this.world.groups[data]
    if (player && group && player.uid === group.owner) {
      socket.emit("gamestate group", group)
    }
  }

  onRequestMovement(socket: Socket, data: any) {
    let uid = this.getPlayerUid(socket.id)
    let selection: number = data.selection
    let target = create(data.target.q, data.target.r, data.target.s)
    const group = this.world.groups[selection]
    if (uid === group?.owner) {
      // Unassign group from building if it's moving away
      if (group.assignedToBuilding !== undefined) {
        const buildingIdToUpdate = group.assignedToBuilding; // Store ID before clearing
        const building = this.world.buildings[buildingIdToUpdate];
        if (building && group.assignedToSlot !== undefined) {
          // Clear the assignment in the building slot
          building.slots[group.assignedToSlot].assignedGroupId = undefined
          
          // Clear the assignment in the group
          group.assignedToBuilding = undefined
          group.assignedToSlot = undefined

          // Emit building update to the client
          socket.emit("gamestate building", building);
        }
      }
      
      let targetTile = this.world.tiles[hash(target)]
      if (targetTile && isNavigable(targetTile)) {
        group.movementStatus = 0
        group.targetHexes = astar(this.world.tiles, group.pos, target)
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

  onRequestRelation(socket: Socket, data) {
    let hash = PlayerRelation.hash(data.id1, data.id2)
    let playerRelation = this.world.playerRelations[hash]
    if (!playerRelation) {
      playerRelation = PlayerRelation.create(
        data.id1,
        data.id2,
        EnumRelationType.hostile
      )
      this.world.playerRelations[hash] = playerRelation
    }
    socket.emit("gamestate relation", playerRelation)
  }

  onRequestTransfer(socket: Socket, data) {
    let uid = this.getPlayerUid(socket.id)
    const group = this.world.groups[data.groupId]
    if (group.owner !== uid) {
      console.warn(
        `Player '${uid}' tried to transfer resources to group he doesn't own`
      )
      return
    }

    if (group) {
      let tile = this.world.tiles[hash(group.pos)]
      let amount = data.amount
      let resource = data.resource

      if (!tile.resources[resource]) {
        tile.resources[resource] = 0
      }

      if (!group.resources[resource]) {
        group.resources[resource] = 0
      }

      if (
        tile.resources[resource] + amount >= 0 &&
        group.resources[resource] - amount >= 0
      ) {
        tile.resources[resource] += amount
        group.resources[resource] -= amount //TODO: Check if allowed
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
    
    const assignmentsToRestore: Array<{ groupId: number; resourceType: string, originalSlotIndex: number }> = [];
    const groupsToUpdateClient = new Set<number>();

    building.slots.forEach((slot, slotIndex) => {
      if (slot.assignedGroupId) {
        const group = this.world.groups[slot.assignedGroupId];
        if (group) {
          assignmentsToRestore.push({ groupId: group.id, resourceType: slot.resourceType, originalSlotIndex: slotIndex });
          // Proactively unassign group, its state will be updated after attempting re-assignment
          group.assignedToBuilding = undefined;
          group.assignedToSlot = undefined;
          groupsToUpdateClient.add(group.id); // Mark for client update
        }
      }
    });

    // Subtract resources from the tile
    subtractResources(tile, building.upgradeRequirements)
    
    // Upgrade the building
    const upgradedBuilding = upgradeBuilding(building)
    if (!upgradedBuilding) {
      console.warn(`Failed to upgrade building ${buildingId}`)
      // If upgrade fails, groups are unassigned. We should send their updated (unassigned) state.
      assignmentsToRestore.forEach(assignment => {
        const group = this.world.groups[assignment.groupId];
        if (group) {
          socket.emit("gamestate group", group);
        }
      });
      return
    }
    
    // Update the building in the world
    this.world.buildings[buildingId] = upgradedBuilding
    
    // Re-assign groups to upgraded building
    assignmentsToRestore.forEach(assignment => {
      const group = this.world.groups[assignment.groupId];
      if (group) {
        // Try to find a suitable slot in the upgraded building
        const newSlotIndex = upgradedBuilding.slots.findIndex(
          (newSlot, index) => newSlot.resourceType === assignment.resourceType && newSlot.assignedGroupId === undefined
        );

        if (newSlotIndex !== -1) {
          upgradedBuilding.slots[newSlotIndex].assignedGroupId = group.id;
          group.assignedToBuilding = upgradedBuilding.id;
          group.assignedToSlot = newSlotIndex;
        }
        // If no suitable slot is found, the group remains unassigned (already handled by proactive unassignment)
        groupsToUpdateClient.add(group.id); // Ensure it's marked for update
      }
    });
    
    // Notify the client
    socket.emit("gamestate building", upgradedBuilding)
    socket.emit("gamestate tiles", { [hash(tile.hex)]: tile })

    // Notify client about updated groups
    groupsToUpdateClient.forEach(groupId => {
      const group = this.world.groups[groupId];
      if (group) {
        socket.emit("gamestate group", group);
      }
    });
    
    // Update player visibilities as spotting might have changed
    this.updatePlayerVisibilities(uid)
  }

  /**
   * Assigns a group to a building slot
   */
  onRequestAssignGroup(socket: Socket, data: any) {
    const uid = this.getPlayerUid(socket.id)
    if (!uid) return
    
    const groupId = data.groupId
    const buildingId = data.buildingId
    const slotIndex = data.slotIndex
    
    const group = this.world.groups[groupId]
    const building = this.world.buildings[buildingId]
    
    // Validate ownership and existence
    if (!group || !building || group.owner !== uid || building.owner !== uid) {
      console.warn(`Invalid assignment request from player ${uid}`)
      return
    }
    
    // Check if group is at the same position as the building
    if (!equals(group.pos, building.position)) {
      console.warn(`Group ${groupId} is not at the same position as building ${buildingId}`)
      return
    }
    
    // Check if slot exists
    if (slotIndex < 0 || slotIndex >= building.slots.length) {
      console.warn(`Invalid slot index ${slotIndex} for building ${buildingId}`)
      return
    }

    // Check if the group is already assigned to a different slot in the same building
    if (group.assignedToBuilding === buildingId && group.assignedToSlot !== undefined && group.assignedToSlot !== slotIndex) {
      console.warn(`Group ${groupId} is already assigned to slot ${group.assignedToSlot} in building ${buildingId}`)
      return;
    }
    
    // If slot is already assigned to another group, unassign it
    const slot = building.slots[slotIndex]
    if (slot.assignedGroupId && slot.assignedGroupId !== groupId) {
      const previousGroup = this.world.groups[slot.assignedGroupId]
      if (previousGroup) {
        previousGroup.assignedToBuilding = undefined
        previousGroup.assignedToSlot = undefined
      }
    }
    
    // Unassign group from previous building if any (and it's a different building)
    if (group.assignedToBuilding !== undefined && group.assignedToBuilding !== buildingId) {
      const previousBuilding = this.world.buildings[group.assignedToBuilding]
      if (previousBuilding && group.assignedToSlot !== undefined) {
        previousBuilding.slots[group.assignedToSlot].assignedGroupId = undefined
      }
    }
    
    // Assign group to building slot
    slot.assignedGroupId = groupId
    group.assignedToBuilding = buildingId
    group.assignedToSlot = slotIndex
    
    // Notify the client
    socket.emit("gamestate group", group)
    socket.emit("gamestate building", building)
  }
  
  /**
   * Unassigns a group from a building slot
   */
  onRequestUnassignGroup(socket: Socket, data: any) {
    const uid = this.getPlayerUid(socket.id)
    if (!uid) return
    
    const groupId = data.groupId
    
    const group = this.world.groups[groupId]
    
    // Validate ownership and existence
    if (!group || group.owner !== uid) {
      console.warn(`Invalid unassignment request from player ${uid}`)
      return
    }
    
    // Check if group is assigned to a building
    if (group.assignedToBuilding === undefined || group.assignedToSlot === undefined) {
      console.warn(`Group ${groupId} is not assigned to any building`)
      return
    }
    
    const building = this.world.buildings[group.assignedToBuilding]
    if (building) {
      // Clear the assignment in the building slot
      building.slots[group.assignedToSlot].assignedGroupId = undefined
      
      // Notify about the building update
      socket.emit("gamestate building", building)
    }
    
    // Clear the assignment in the group
    group.assignedToBuilding = undefined
    group.assignedToSlot = undefined
    
    // Notify the client
    socket.emit("gamestate group", group)
  }

  /**
   * Handles a request to hire a new group
   */
  onRequestHireGroup(socket: Socket, data: { buildingId: number, groupType: string }) {
    const uid = this.getPlayerUid(socket.id)
    if (!uid) return
    
    const { buildingId } = data
    const building = this.world.buildings[buildingId]
    
    // Validate ownership and existence
    if (!building || building.owner !== uid) {
      console.warn(`Invalid group hiring request from player ${uid}`)
      return
    }
    
    // Define standard cost for hiring a group
    const cost: Partial<Resources> = {
      berries: 15,
      wood: 5,
      stone: 5
    }
    
    // Check if player has enough resources to hire the group
    const tile = this.world.tiles[hash(building.position)]
    if (!tile) return
    
    // Check if the required resources are available
    if (!this.hasResources(tile, cost)) {
      console.warn(`Not enough resources to hire a group`)
      return
    }
    
    // Subtract resources
    subtractResources(tile, cost)
    
    // Create the new group with random attributes
    const newGroup = createGroup(++this.world.idCounter, uid, "Group", building.position)
    this.world.groups[newGroup.id] = newGroup
    
    // Notify the client
    socket.emit("gamestate group", newGroup)
    socket.emit("gamestate tile", tile)
    
    // Update visibilities
    this.updatePlayerVisibilities(uid)
  }

  onRequestSetGroupBehavior(socket: Socket, data: { groupId: number; behavior: GroupBehavior }) {
    const uid = this.getPlayerUid(socket.id);
    if (!uid) return;

    const group = this.world.groups[data.groupId];
    if (!group || group.owner !== uid) {
      console.warn(`Player ${uid} cannot set behavior for group ${data.groupId}`);
      return;
    }

    // Validate behavior value (optional, but good practice if values might be arbitrary)
    if (!Object.values(GroupBehavior).includes(data.behavior)) {
        console.warn(`Invalid behavior value received: ${data.behavior}`);
        return;
    }

    group.behavior = data.behavior;
    console.log(`Group ${group.id} behavior set to ${GroupBehavior[group.behavior]} by player ${uid}`);

    // Notify the client who made the change, and potentially other clients if this group is visible to them.
    // For simplicity, just sending to the owner for now. A broader update might be needed.
    socket.emit("gamestate group", group);
    
    // If the group is visible to other players, they should also get an update.
    // This can be handled by the general groups update in updateNet, or by a targeted emit here.
    // For now, relying on existing updateNet which sends all visible groups.
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
      Object.values(this.world.groups).forEach((group) => {
        if (group.owner === uid) {
          let visible = neighborsRange(group.pos, group.spotting)
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

  private getVisibleGroups(hexes: Hex[]): Hashtable<Group> {
    let result: Hashtable<Group> = {}
    for (let hex of hexes) {
      Object.values(this.world.groups).forEach((group) => {
        if (equals(group.pos, hex)) result[group.id] = group
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
   * Returns true if uid has group at pos
   * @param pos
   * @param uid
   */
  private hasGroupAt(pos: Hex, uid: string): boolean {
    let found = false
    Object.values(this.world.groups).forEach((group) => {
      if (equals(group.pos, pos) && group.owner === uid) {
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
   * Returns true if uid has group or building at pos
   * @param pos
   * @param uid
   */
  private hasPresence(pos: Hex, uid: string): boolean {
    return this.hasGroupAt(pos, uid) || this.hasBuildingAt(pos, uid)
  }

  /**
   * Checks if the object (building or group) can be created on tile
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
    const groupToDisband = this.world.groups[data.groupId]
    if (groupToDisband.owner !== uid) {
      console.warn(`Player '${uid}' tried to disband group that they don't own`)
      return
    }

    if (groupToDisband) {
      delete this.world.groups[groupToDisband.id]
      this.updatePlayerVisibilities(uid)
    }
  }

  /**
   * Applies a chance for a group to receive an injury.
   * Generates different types of injuries based on damage and severity.
   */
  applyInjuryChance(group: Group, damageTaken: number) {
    if (damageTaken <= 0) return;

    // Higher damage and lower pain threshold increase injury chance
    const injuryChance = (damageTaken / 20) - (group.painThreshold / 20); // Example: 10 damage = 50% base, 10 pain threshold reduces by 50%

    if (Math.random() < injuryChance) {
      // Determine injury severity based on damage taken
      let severity = InjurySeverity.Minor;
      let isPermanent = false;
      let duration = 1000; // Default duration for minor injuries
      
      if (damageTaken > 30) {
        severity = InjurySeverity.Critical;
        // 25% chance of permanent injury at critical level
        isPermanent = Math.random() < 0.25;
        duration = isPermanent ? undefined : 5000;
      } else if (damageTaken > 20) {
        severity = InjurySeverity.Severe;
        // 10% chance of permanent injury at severe level
        isPermanent = Math.random() < 0.1;
        duration = isPermanent ? undefined : 3000;
      } else if (damageTaken > 10) {
        severity = InjurySeverity.Moderate;
        // 5% chance of permanent injury at moderate level
        isPermanent = Math.random() < 0.05;
        duration = isPermanent ? undefined : 2000;
      }
      
      // Select an injury type based on severity
      let injuryName = "Minor Laceration";
      let injuryDescription = "A superficial cut.";
      let effects: Array<{ effect: InjuryEffect; magnitude: number; duration?: number }> = [];
      
      switch (severity) {
        case InjurySeverity.Minor:
          // Choose from minor injuries
          const minorInjuries = [
            { name: "Minor Laceration", desc: "A superficial cut.", effect: InjuryEffect.MoraleDecrease, magnitude: 5 },
            { name: "Bruised Arm", desc: "A painful bruise.", effect: InjuryEffect.StrengthDecrease, magnitude: 3 },
            { name: "Sprained Ankle", desc: "Mild pain when walking.", effect: InjuryEffect.AgilityDecrease, magnitude: 3 }
          ];
          const minorChoice = minorInjuries[Math.floor(Math.random() * minorInjuries.length)];
          injuryName = minorChoice.name;
          injuryDescription = minorChoice.desc;
          effects = [{ effect: minorChoice.effect, magnitude: minorChoice.magnitude, duration }];
          break;
          
        case InjurySeverity.Moderate:
          // Choose from moderate injuries
          const moderateInjuries = [
            { name: "Deep Cut", desc: "A painful gash that will take time to heal.", effect: InjuryEffect.StrengthDecrease, magnitude: 8 },
            { name: "Concussion", desc: "Dizziness and headaches affect concentration.", effect: InjuryEffect.InitiativeDecrease, magnitude: 8 },
            { name: "Twisted Knee", desc: "Mobility is reduced.", effect: InjuryEffect.AgilityDecrease, magnitude: 8 }
          ];
          const modChoice = moderateInjuries[Math.floor(Math.random() * moderateInjuries.length)];
          injuryName = modChoice.name;
          injuryDescription = modChoice.desc;
          effects = [
            { effect: modChoice.effect, magnitude: modChoice.magnitude, duration },
            { effect: InjuryEffect.MoraleDecrease, magnitude: 5, duration }
          ];
          break;
          
        case InjurySeverity.Severe:
          // Choose from severe injuries
          const severeInjuries = [
            { name: "Broken Bone", desc: "A fracture that severely limits function.", effect: InjuryEffect.StrengthDecrease, magnitude: 15 },
            { name: "Severe Trauma", desc: "Physical and mental effects are significant.", effect: InjuryEffect.InitiativeDecrease, magnitude: 15 },
            { name: "Deep Wound", desc: "Blood loss and pain affect overall capability.", effect: InjuryEffect.AgilityDecrease, magnitude: 15 }
          ];
          const sevChoice = severeInjuries[Math.floor(Math.random() * severeInjuries.length)];
          injuryName = sevChoice.name;
          injuryDescription = sevChoice.desc;
          effects = [
            { effect: sevChoice.effect, magnitude: sevChoice.magnitude, duration },
            { effect: InjuryEffect.MoraleDecrease, magnitude: 10, duration }
          ];
          break;
          
        case InjurySeverity.Critical:
          // Choose from critical injuries
          const criticalInjuries = [
            { name: "Severed Limb", desc: "Permanent loss of function.", effect: InjuryEffect.StrengthDecrease, magnitude: 25 },
            { name: "Brain Damage", desc: "Cognitive abilities are permanently impaired.", effect: InjuryEffect.InitiativeDecrease, magnitude: 25 },
            { name: "Crippling Wound", desc: "Movement is severely and permanently restricted.", effect: InjuryEffect.AgilityDecrease, magnitude: 25 }
          ];
          const critChoice = criticalInjuries[Math.floor(Math.random() * criticalInjuries.length)];
          injuryName = critChoice.name;
          injuryDescription = critChoice.desc;
          effects = [
            { effect: critChoice.effect, magnitude: critChoice.magnitude, duration },
            { effect: InjuryEffect.MoraleDecrease, magnitude: 20, duration }
          ];
          break;
      }
      
      // For permanent injuries, modify the description to indicate permanence
      if (isPermanent) {
        injuryDescription = "PERMANENT: " + injuryDescription;
        // Remove duration for permanent injuries
        effects.forEach(effect => {
          effect.duration = undefined;
        });
      }
      
      // Create and add the injury
      const newInjury: Injury = {
        id: `inj_${this.world.idCounter++}_${Date.now()}`,
        name: injuryName,
        description: injuryDescription,
        severity,
        effects,
        timeOfInjury: this.actualTicks,
        isPermanent,
        healable: !isPermanent,
      };
      
      group.injuries.push(newInjury);
      console.log(`Group ${group.id} received injury: ${newInjury.name} (${InjurySeverity[severity]}${isPermanent ? ", Permanent" : ""})`);
    }
  }

  // New method to process group healing
  processGroupHealing(group: Group) {
    if (group.injuries.length === 0) return;

    // Create a copy of the injuries array since we'll be modifying it
    const currentInjuries = [...group.injuries];
    
    // Check each injury for healing
    currentInjuries.forEach((injury, index) => {
      // Don't process permanent injuries for natural healing
      if (injury.isPermanent) return;
      
      // Only process healable injuries
      if (!injury.healable) return;
      
      // Check if the injury has a duration and if it's expired
      const hasExpired = injury.effects.every(effect => {
        if (effect.duration && this.actualTicks > injury.timeOfInjury + effect.duration) {
          return true; // Effect has expired
        }
        return false; // Effect is still active
      });
      
      if (hasExpired) {
        // Remove the expired injury
        const indexToRemove = group.injuries.findIndex(inj => inj.id === injury.id);
        if (indexToRemove !== -1) {
          group.injuries.splice(indexToRemove, 1);
          console.log(`Group ${group.id} recovered from injury: ${injury.name}`);
          
          // Notify the player about the healing
          const socket = this.uidsockets[group.owner];
          if (socket && socket.connected) {
            socket.emit("gamestate group", group);
          }
        }
      }
    });
  }
}

function calculateMovementProgress(
  _group: Group,
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
