import * as db from "../util/db";
import Log from "../util/log";
import Vector2 from "../../../shared/vector2";
import * as Util from "../../../shared/util";

/**
 * Klasse mit statischen Helper Funktionen um andere Klassen wie gameserver zu entlasten
 */
export default abstract class Helper {

  /**
   * Gibt den Username anhand der uid wieder
   * @param uid Firebase uid
   */
  static getUsername(uid: string): Promise<string> {
    return new Promise(function (resolve, reject) {
      db.queryWithValues("SELECT username FROM users WHERE uid LIKE (?)", uid, function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          if (results.length >= 1) {
            resolve(results[0].username);
          } else {
            reject(new Error("No name found"));
          }
        }
      });
    });
  }

  static requestSpawnPosition(teamId: number, mapWidth:number, mapHeight:number,): Vector2 {
    const margin = 50;
    const spawnboxWidth = 100;
    const spawnboxHeight = mapHeight;
    if (teamId === 0) {
      const x = Util.scale(Math.random(), 0, 1, margin, margin + spawnboxWidth);
      const y = Util.scale(Math.random(), 0, 1, margin, spawnboxHeight - margin);
      return new Vector2(x, y);
    } else if (teamId === 1) {
      const x = Util.scale(Math.random(), 0, 1, mapWidth - (margin + spawnboxWidth), mapWidth - margin);
      const y = Util.scale(Math.random(), 0, 1, margin, spawnboxHeight - margin);
      return new Vector2(x, y);
    } else {
      throw Error("invalid teamId given");
    }
  }

  static requestSpawnOrientation(teamId: number): number {
    if (teamId === 0) {
      return 0;
    } else if (teamId === 1) {
      return 180;
    } else {
      throw Error("invalid teamId given");
    }
  }

}