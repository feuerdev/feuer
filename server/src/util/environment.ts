import * as dotenv from "dotenv"
import yargs from "yargs"

// Load .env file into environment
dotenv.config()

// Load Config object from environment via yargs
const Config = yargs(process.argv.slice(2))
  .env("FEUER")
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
  .option("firebaseProjectId", {
    alias: "FB_project_id",
    description: "Firebase Project Id",
    type: "string",
    default: "feuer-io",
  })
  .option("fbKey", {
    alias: "FB_KEY",
    description: "Firebase Private Key",
    type: "string",
  })
  .option("firebaseClientEmail", {
    alias: "FB_client_email",
    description: "Firebase Client Email",
    type: "string",
    default: "firebase-adminsdk-pnpe7@feuer-io.iam.gserviceaccount.com",
  })
  .parseSync()

export default Config
