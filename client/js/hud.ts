// import $ from 'jquery';
// import * as Rules from "../../shared/rules.json";
// import Hex from "../../shared/hex";

// export interface HudListener {
//   onConstructionRequested?(name: string): void;
//   onUnitRequested?(name: string): void;
//   onUnitsSelected?(uids: string[]): void;
// }

// enum EnumTabConstruction {
//   tabBuildings,
//   tabUnits
// }

// enum EnumTabSelection {
//   tabTile,
//   tabBuildings,
//   tabUnits
// }

// export default class Hud {

//   private divConstruction;
//   private divSelection;
//   private btnConstructionBuildings;
//   private btnConstructionUnits;

//   private btnSelectionTile;
//   private btnSelectionBuildings;
//   private btnSelectionUnits;

//   private divSelectionContentTile;
//   private divSelectionContentBuildings;
//   private divSelectionContentUnits;

//   private readonly listeners: HudListener[] = [];

//   constructor() {
//     this.divConstruction = $(".hud-left");
//     this.divSelection = $(".hud-right");

//     this.btnConstructionBuildings = $("#button-construction-buildings");
//     this.btnConstructionUnits = $("#button-construction-units");
//     this.btnSelectionTile = $("#button-selection-tile");
//     this.btnSelectionBuildings = $("#button-selection-buildings");
//     this.btnSelectionUnits = $("#button-selection-units");
//     this.divSelectionContentTile = $("#content-selection-tile");
//     this.divSelectionContentBuildings = $("#content-selection-buildings");
//     this.divSelectionContentUnits = $("#content-selection-units");

//     this.btnConstructionBuildings.click(() => this.onConstructionTabSelected(EnumTabConstruction.tabBuildings))
//     this.btnConstructionUnits.click(() => this.onConstructionTabSelected(EnumTabConstruction.tabUnits))

//     this.btnSelectionTile.click(() => this.onSelectionTabSelected(EnumTabSelection.tabTile))
//     this.btnSelectionBuildings.click(() => this.onSelectionTabSelected(EnumTabSelection.tabBuildings))
//     this.btnSelectionUnits.click(() => this.onSelectionTabSelected(EnumTabSelection.tabUnits))

//     this.onConstructionTabSelected(EnumTabConstruction.tabBuildings);
//     this.onSelectionTabSelected(EnumTabSelection.tabTile);
//     this.hideHud();

//     //Populate construction using template
//     let template = $(".hud-tab-content-template");
//     template.hide();
//     for (let i = 0; i < Object.keys(Rules.buildings).length; i++) {
//       let clone = template.clone();
//       clone.show();
//       clone.children('#construction-template-label').text(Object.keys(Rules.buildings)[i]);
//       clone.children('#construction-template-button').click(() => {
//         console.log(Object.keys(Rules.buildings)[i] + " clicked");
//         for (let listener of this.listeners) {
//           if (listener.onConstructionRequested) {
//             listener.onConstructionRequested(Object.keys(Rules.buildings)[i]);
//           }
//         }
//       });
//       $("#content-construction-buildings").append(clone);
//     }
//     for (let i = 0; i < Object.keys(Rules.units).length; i++) {
//       let clone = template.clone();
//       clone.show();
//       clone.children('#construction-template-label').text(Object.keys(Rules.units)[i]);
//       clone.children('#construction-template-button').click(() => {
//         console.log(Object.keys(Rules.units)[i] + " clicked");
//         for (let listener of this.listeners) {
//           if (listener.onUnitRequested) {
//             listener.onUnitRequested(Object.keys(Rules.units)[i]);
//           }
//         }
//       });
//       $("#content-construction-units").append(clone);
//     }
//   }

//   onConstructionTabSelected(tab: EnumTabConstruction): any {
//     switch (tab) {
//       case EnumTabConstruction.tabBuildings:
//         this.btnConstructionBuildings.addClass("active");
//         this.btnConstructionUnits.removeClass("active");
//         $("#content-construction-buildings").show();
//         $("#content-construction-units").hide();
//         break;
//       case EnumTabConstruction.tabUnits:
//         this.btnConstructionUnits.addClass("active");
//         this.btnConstructionBuildings.removeClass("active");
//         $("#content-construction-units").show();
//         $("#content-construction-buildings").hide();
//         break;
//       default: break;
//     }
//   }

//   onSelectionTabSelected(tab: EnumTabSelection): any {
//     switch (tab) {
//       case EnumTabSelection.tabTile:
//         this.btnSelectionTile.addClass("active");
//         this.btnSelectionBuildings.removeClass("active");
//         this.btnSelectionUnits.removeClass("active");
//         $("#content-selection-tile").show();
//         $("#content-selection-buildings").hide();
//         $("#content-selection-units").hide();
//         break;
//       case EnumTabSelection.tabBuildings:
//         this.btnSelectionBuildings.addClass("active");
//         this.btnSelectionTile.removeClass("active");
//         this.btnSelectionUnits.removeClass("active");
//         $("#content-selection-buildings").show();
//         $("#content-selection-units").hide();
//         $("#content-selection-tile").hide();
//         break;
//       case EnumTabSelection.tabUnits:
//         this.btnSelectionTile.removeClass("active");
//         this.btnSelectionBuildings.removeClass("active");
//         this.btnSelectionUnits.addClass("active");
//         $("#content-selection-tile").hide();
//         $("#content-selection-units").show();
//         $("#content-selection-buildings").hide();
//         break;
//       default: break;
//     }
//   }

//   showSelectionHud(cWorld, hex: Hex) {
//     let tile = cWorld.tiles[hex.hash()];
//     this.divSelection.show();
//     this.divSelectionContentTile.text("");
//     this.divSelectionContentBuildings.text("");
//     this.divSelectionContentUnits.text("");

//     this.divSelectionContentTile.append(this.generateTileInfoString(tile));
//     for (let building of cWorld.buildings) {
//       if (hex.equals(building.pos)) {
//         this.divSelectionContentBuildings.append(this.generateBuildingInfoString(building));
//       }
//     }
//     let armies = [];
//     for (let army of cWorld.armies) {
//       if (hex.equals(army.pos)) {
//         armies.push(army);
//         let selectButton = $("<button/>", {
//           type: "button",
//           text: "Select",
//           click: () => {for (let listener of this.listeners) {
//             if (listener.onUnitsSelected) {
//               listener.onUnitsSelected([army.id]);
//             }
//           }}
//         });
//         this.divSelectionContentUnits.append(selectButton);
//         this.divSelectionContentUnits.append(this.generateArmyInfoString(army));
//       }
//     }
//     let selectAllButton = $("<button/>", {
//       type: "button",
//       text: "Select All",
//       click: () => {for (let listener of this.listeners) {
//         if (listener.onUnitsSelected) {
//           listener.onUnitsSelected(armies.map((army)=>army.id));
//         }
//       }}
//     });
//     this.divSelectionContentUnits.append(selectAllButton);
//   }

//   showConstructionHud() {
//     this.divConstruction.show();
//   }

//   hideSelectionHud() {
//     this.divSelection.hide();
//   }

//   hideConstructionHud() {
//     this.divConstruction.hide();
//   }

//   hideHud() {
//     this.hideSelectionHud();
//     this.hideConstructionHud();
//   }

//   generateArmyInfoString(army): string {
//     let result = "";
//     result += "<b>Army Info</b></br>";
//     result += "Id: " + army.id + "</br>";
//     result += "Speed: " + army.speed.toFixed(2) + "</br>";
//     result += "Attack: " + army.attack.toFixed(2) + "</br>";
//     result += "Health: " + army.hp.toFixed(2) + "</br>";
//     result += "Spotting Distance: " + army.spottingDistance.toFixed(2) + "</br>";
//     result += "Target: " + army.targetHexes.slice(-1).pop(); +"</br>";
//     result += "</br>";
//     result += "<b>Carrying</b></br>";
//     result += "Food: " + army.food + "</br>";
//     result += "Wood: " + army.wood + "</br>";
//     result += "Stone: " + army.stone + "</br>";
//     result += "Iron: " + army.iron + "</br>";
//     result += "Gold: " + army.gold + "</br>";
//     result += "</br>";
//     result += "</br>";
//     return result;
//   }

//   generateBuildingInfoString(building): string {
//     let result = "";
//     result += "<b>Building Info</b></br>";
//     result += "Id: " + building.id + "</br>";
//     if (building.foodHarvest) {
//       result += "Food Generation: " + building.foodHarvest + "</br>";
//     }
//     if (building.woodHarvest) {
//       result += "Wood Generation: " + building.woodHarvest + "</br>";
//     }
//     if (building.stoneHarvest) {
//       result += "Stone Generation: " + building.stoneHarvest + "</br>";
//     }
//     if (building.ironHarvest) {
//       result += "Iron Generation: " + building.ironHarvest + "</br>";
//     }
//     if (building.goldHarvest) {
//       result += "Iron Generation: " + building.goldHarvest + "</br>";
//     }
//     return result;
//   }

//   generateTileInfoString(tile): string {
//     let result = "";
//     result += "Position: " + Hex.hash(tile.hex) + "</br>";
//     result += "</br>";
//     result += "<b>Resources</b></br>";
//     for(let res of Object.keys(tile.resources)) {
//       result += `${res}: ${tile.resources[res]}</br>`;
//     }
//     result += "</br>";
//     result += "<b>Tile Info</b></br>";
//     result += "Forestation: " + tile.forestation.toFixed(2) + "</br>";
//     result += "Iron Ore: " + tile.ironOre.toFixed(2) + "</br>";
//     result += "Gold Ore: " + tile.goldOre.toFixed(2) + "</br>";
//     result += "Height: " + tile.height.toFixed(2) + "</br>";
//     result += "Rockyness: " + tile.rockyness.toFixed(2) + "</br>";
//     result += "Movementfactor: " + tile.movementFactor.toFixed(2) + "</br>";
//     return result;
//   }

//   addListener(listener: HudListener) {
//     this.listeners.push(listener);
//   }

//   removeListener(listener: HudListener) {
//     const index = this.listeners.indexOf(listener);
//     if (index > -1) {
//       this.listeners.splice(index, 1);
//     }
//   }

// }