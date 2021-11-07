import { Config } from "./main"

/**
 * Klasse mit statischen Helper Funktionen um andere Klassen wie gameserver zu entlasten
 */
export default abstract class Helper {
  /**
   * Gibt den Username anhand der uid wieder
   * @param uid Firebase uid
   */
  static async getUsername(uid: string): Promise<string> {
    return new Promise(function (resolve, reject) {
      // db.queryWithValues(
      //   "SELECT username FROM users WHERE uid LIKE (?)",
      //   uid,
      //   function (error, results, fields) {
      //     if (error) {
      //       reject(error)
      //     } else {
      //       if (results.length >= 1) {
      //         resolve(results[0].username)
      //       } else {
      //         reject(new Error("No name found"))
      //       }
      //     }
      //   }
      // )
    })
  }
}
