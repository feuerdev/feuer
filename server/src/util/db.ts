import * as mysql from "mysql";
import Log from "./log";

let pool;

function getPool() {
  if(!pool) {
    pool = mysql.createPool({
      connectionLimit : 10,
      host            : process.env.DB_HOST,
      user            : process.env.DB_USER,
      password        : process.env.DB_PASSWORD,
      database        : process.env.DB_NAME
    });
  }
  return pool;  
}

export function query(sql) {
  getPool().query(sql, function(error, results, fields) {
    if(error) throw error;
    return results;
  });
}