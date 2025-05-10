import * as dotenv from "dotenv"
import yargs from "yargs"
import * as Rules from "../../shared/rules.json" with { type: "json" };

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
  .option("clientUrls", {
    alias: "c",
    description: "Comma-separated list of client URLs",
    type: "string",
  })
  .option("forceAuth", {
    description: "Whether to force authentication in development",
    type: "boolean",
    default: false
  })
  .option("clerkSecretKey", {
    description: "Clerk secret key",
    type: "string",
  })
  .option("nodeEnv", {
    description: "Node environment (development/production)",
    type: "string",
    default: process.env.NODE_ENV || "development"
  })
  .parseSync()

console.debug("Config loaded:", Config)

export default Config
