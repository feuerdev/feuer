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
- [ ] Implement group hiring system
- [ ] Create group experience and leveling system
- [ ] Implement group training mechanics
- [ ] Add UI for group management and stats

### Phase 3: Combat System

- [ ] Enhance existing battle system with turn-based mechanics
- [ ] Implement group behavior programming interface
- [ ] Add permanent injuries and death mechanics
- [ ] Create building vs group combat
- [ ] Add defensive building modifiers
- [ ] Add UI for combat behavior programming

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
- [ ] Add achievement system
- [ ] Create endgame content

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
- `groupEfficiency` is the group's efficiency for that resource type (affected by unit stats)
- `resourceAvailabilityFactor` decreases as resources are depleted (< 10 units)
- `deltaFactor` is the time factor for the update cycle
