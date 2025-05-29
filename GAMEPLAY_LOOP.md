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
- [C] Enhance existing battle system with turn-based mechanics
  - [x] The logic should take into account the groups stats
  - [x] Add the following stats to the group that will affect the battle and are generated when the group is created:
    - [x] Strength
    - [x] Fortitude
    - [x] Initiative
    - [x] Agility
    - [x] Pain Threshold
    - [x] Intelligence
  - [C] Add an injuries system
    - [x] Add a new hud element for the injuries
    - [x] Injuries should persist between battles
    - [C] Some injuries should be able to be healed over time
    - [C] Some injuries should be unable to be healed
  - [x] The stats and the battle situation and injuries should affect the groups morale
  - [x] Allow for groups to flee from a battle when their morale is low
- [C] Enable that every group joining a tile with an ongoing battle will join the battle
  - [ ] implement a system for battles to match multiple groups in individual duels
  - [C] a battle will continue until all groups are defeated or the battle is over
- [ ] Implement group behavior programming interface
  - [ ] Add a new hud element for the group behavior programming
  - [ ] Start with simple aggressive and defensive behavior
  - [ ] Update the battle system to use the group behavior programming
- [ ] Create defensive buildings
- [ ] Create group vs tile combat
  - [ ] Defensive buildings should be able to defend the tile from attacks

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
