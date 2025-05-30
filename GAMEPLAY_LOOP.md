# Feuer - Core Gameplay Loop

## Overview

This document outlines the core gameplay loop and implementation steps for Feuer, a strategy game with resource management, building construction, and combat elements.

## Core Gameplay Loop

1. **Resource Collection** → **Building Construction** → **Group Management** → **Combat** → **Expansion** → **Resource Collection** (loop continues)

## Implementation Priorities

### Phase 1: Resource Gathering & Building System

- [x] Implement group assignment to buildings
- [x] Create resource generation based on assigned groups
- [x] Add resource gathering modifiers (tile type, group stats)
- [x] Implement building upgrades system
- [x] Add building slots for group assignment
- [x] Add UI for building upgrades
- [x] Add UI for group assignment to buildings

### Phase 2: Group Management

- [x] Add group stats (gathering, combat, etc.)
- [x] Implement group hiring system
- [x] Simplify code structure by removing units

### Phase 3: Combat System

- [x] Add battle UI to display a live battle
  - [x] Draw an indicator on the tile where the battle is happening
  - [x] Implement a new floating hud element for the battle
  - [x] It should update live with the battle
  - [x] It should be able to be closed
  - [x] It should show the battle result after it is over
- [x] Enhance existing battle system with turn-based mechanics
  - [x] The logic should take into account the groups stats
  - [x] Add the following stats to the group that will affect the battle and are generated when the group is created:
    - [x] Strength
    - [x] Fortitude
    - [x] Initiative
    - [x] Agility
    - [x] Pain Threshold
    - [x] Intelligence
  - [x] The stats and the battle situation and injuries should affect the groups morale
  - [x] Allow for groups to flee from a battle when their morale is low
- [x] Enable that every group joining a tile with an ongoing battle will join the battle
  - [x] implement a system for battles to match multiple groups in individual duels
  - [x] a battle will continue until all groups are defeated or the battle is over
- [x] Implement group behavior programming interface
  - [x] Add a new hud element for the group behavior programming
  - [x] Start with simple aggressive and defensive behavior
  - [x] Update the battle system to use the group behavior programming
- [ ] Fix the check for battle system
  - [ ] It should create a battle if the group joins a tile with an enemy group
  - [ ] It should join a group to an ongoing battle if the group joins a tile with an ongoing battle and the group is hostile to the other group in the battle
  - [ ] If possible it shouldn't need to do a O(n^2) lookup to check for battles
  - [ ] It should be able to handle multiple battles on the same tile
- [ ] Add defensive buildings that can be built on tiles
  - [ ] The defensive buildings should not be able to attack
  - [ ] The defensive buildings should give bonuses to the group that is defending the tile
- [ ] Add a loot system for the battle winner
  - [ ] The winning team should get a percentage of the resources of the losing team
- [x] Add system to change the relation between two players
  - [x] Add a new hud element for the relation between two players
  - [x] The relation should be able to be changed by the players
- [ ] Add a limb health and injuries system
  - [ ] Add a new hud element for the injuries
  - [ ] Injuries should persist between battles
  - [ ] Some injuries should be able to be healed over time
  - [ ] Some injuries should be unable to be healed


### Phase 4: Morale & Advanced Mechanics

- [ ] Implement morale system
- [ ] Add food variety and regional food types
- [ ] Create special buildings that affect morale
- [ ] Implement gold as payment for morale boosts
- [ ] Add UI for morale management

### Phase 5: Player Interaction

- [ ] Add trading system
- [ ] Implement guilds
- [ ] Create information sharing mechanics
- [ ] Add cooperative defense mechanisms
- [ ] Add UI for player interaction

### Phase 6: Long-term Goals

- [ ] Implement leaderboards
- [ ] Create group experience and leveling system
- [ ] Implement group training mechanics
- [ ] Add UI for group management and stats

## Immediate Next Steps

1. ✅ Modify the Building class to support group assignment slots
2. ✅ Update the Group class to include resource gathering stats
3. ✅ Implement resource generation based on assigned groups
4. ✅ Add building upgrade system
5. ✅ Create UI components for:
   - Group assignment to buildings
   - Building upgrades
   - Resource gathering visualization
6. ✅ Implement client-side socket handlers for the new group assignment events
7. ✅ Implement group hiring system with specialized group types
8. ✅ Simplify codebase by removing units and adding stats directly to groups

## Technical Implementation Notes

- ✅ Extended the Building class to support group assignment slots
- ✅ Added ResourceSlot type for managing group assignments
- ✅ Added gathering efficiency stats to Group class
- ✅ Implemented server-side resource generation based on assigned groups
- ✅ Added building upgrade system with levels and improved slots
- ✅ Implemented client-side UI for:
  - Displaying building slots and assigned groups
  - Managing group assignments
  - Upgrading buildings
  - Showing resource generation rates
- ✅ Implemented group hiring system with:
  - Different group types with specialized gathering skills
  - Resource costs for hiring
  - UI for hiring groups at buildings
- ✅ Simplified code structure by:
  - Removing Unit type and related types
  - Adding stats directly to Group
  - Simplifying battle system

## Resource Generation Formula

Resource generation is now calculated using the following factors:

1. Base production rate of the building for the resource
2. Slot efficiency (varies by building level and slot)
3. Group's gathering efficiency for the resource type
4. Tile's resource availability factor

The formula is:

```
productionRate = baseProduction * slotEfficiency * groupEfficiency * resourceAvailabilityFactor * deltaFactor
```

Where:

- `baseProduction` is the base production rate defined in the building template
- `slotEfficiency` is the efficiency of the specific slot (1.0 = 100%)
- `groupEfficiency` is the group's efficiency for that resource type (affected by group stats)
- `resourceAvailabilityFactor` decreases as resources are depleted (< 10 units)
- `deltaFactor` is the time factor for the update cycle
