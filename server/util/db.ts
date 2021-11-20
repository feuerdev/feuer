import { MongoClient, Db } from "mongodb"
import { Config } from "../main"

export function getDb(): Promise<Db> {
  return new Promise((resolve, reject) => {
    const uri = `mongodb://${Config.dbUser}:${Config.dbPassword}@${Config.dbHost}`
    const client = new MongoClient(uri)
    client
      .connect()
      .then((client) => {
        resolve(client.db(Config.dbName))
      })
      .catch((error) => {
        reject(error)
      })
  })
}
