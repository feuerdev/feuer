import * as mysql from "mysql"
import { Config } from "../main"

let pool

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      connectionLimit: 10,
      host: Config.dbHost,
      user: Config.dbUser,
      password: Config.dbPassword,
      database: Config.dbName,
    })
  }
  return pool
}

export function query(sql, callback) {
  getPool().query(sql, callback)
}
export function queryWithValues(sql, values, callback) {
  getPool().query(sql, values, callback)
}
