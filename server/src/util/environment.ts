import * as dotenv from "dotenv"
import yargs from "yargs"
import * as Rules from "../../../shared/rules.json"

// Load .env file into environment
dotenv.config()

// Load Config object from environment via yargs
const Config = yargs(process.argv.slice(2))
  .env("FEUER")
  // TODO: Make it so that rules can be loaded from the environment
  .config(Rules)
  .option("logLevel", {
    alias: "l",
    description: "Log level for winston logger",
    choices: ["error", "warn", "info", "verbose", "debug"],
    type: "string",
    default: "info",
  })
  .option("port", {
    alias: "p",
    description: "The port to expose the server",
    type: "number",
    default: 3000,
  })
  .option("updateRate", {
    alias: "u",
    description:
      "How many times per second the server will send updates to all clients",
    type: "number",
    default: 1,
  })
  .option("referenceRate", {
    alias: "r",
    description: "How fast the game will run",
    type: "number",
    default: 1,
  })
  .option("clientUrl", {
    alias: "c",
    description: "The URL of the client",
    type: "string",
  })
  .parseSync()

console.debug("Config loaded:", Config)

export default Config
