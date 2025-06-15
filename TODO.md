# Feuer - TODO

### Resource Gathering & Building System

- [x] Implement group assignment to buildings
- [x] Create resource generation based on assigned groups
- [x] Add resource gathering modifiers (tile type, group stats)
- [x] Implement building upgrades system
- [x] Add building slots for group assignment
- [x] Add UI for building upgrades
- [x] Add UI for group assignment to buildings

### Unit Management

- [x] Add group stats (gathering, combat, etc.)
- [x] Implement group hiring system
- [x] Simplify code structure by removing units

### Combat System

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


### Groups

- [ ] Rename groups to units
- [ ] Add group entity
- [ ] Add UI to create groups
- [ ] Add UI to delete groups
- [ ] Add UI to rename groups
- [ ] Add UI to assign units to groups
- [ ] Add UI to remove units from groups

### UI, UX & HUD

- [ ] Box select units

### Morale & Advanced Mechanics

- [ ] Implement morale system
- [ ] Add food variety and regional food types
- [ ] Create special buildings that affect morale
- [ ] Implement gold as payment for morale boosts
- [ ] Add UI for morale management

### Player Interaction

- [ ] Add trading system
- [ ] Implement guilds
- [ ] Create information sharing mechanics
- [ ] Add cooperative defense mechanisms
- [ ] Add UI for player interaction

### Long-term Goals

- [ ] Implement leaderboards
- [ ] Create group experience and leveling system
- [ ] Implement group training mechanics
- [ ] Add UI for group management and stats

### Debug Menu

- [x] Create a new UI component for the debug menu.
  - [x] The menu should be hidden by default.
  - [x] Add a key combination to toggle the menu's visibility.
  - [x] The menu should only be accessible when the game is running in a development environment.
- [x] Implement functionality to add resources:
  - [x] Add UI elements (e.g., input fields for resource type and amount, buttons).
  - [x] Add button to add resources to the currently selected tile or group.
  - [x] Add a button that adds 1000 resources of all types to the currently selected tile or group.
  - [x] Handle the server-side logic for adding resources to a tile or group.
- [x] Implement functionality to spawn buildings:
  - [x] Add UI elements (e.g., a dropdown or list to select building type).
  - [x] Add a button to spawn the selected building on the currently selected tile.
  - [x] Ensure this action correctly triggers server-side building placement logic.
  - [x] Handle the server-side logic for spawning a building on a tile.
- [x] Implement functionality to spawn new groups:
  - [x] Add UI elements
  - [x] Add a button to spawn the selected group(s) on the currently selected tile or a default spawn location.
  - [x] Handle the server-side logic for spawning a group on a tile.
- [x] Implement functionality to kill/destroy the currently selected entity:
  - [x] Add a button (e.g., "Delete Selected Entity") to the debug menu.
  - [x] When clicked, it should identify the currently selected group or building.
  - [x] Implement server-side logic to safely remove the entity from the game state.
  - [x] Ensure the client UI updates correctly after deletion.
