import { Assets } from "pixi.js";

let initialized = false;
/**
 * Initialize the PixiJS asset loader and load the main bundle
 * This function ensures initialization and loading happens only once
 */
export async function loadAssets(): Promise<void> {
  // Initialize assets only once
  if (!initialized) {
    await Assets.init({
      manifest: "manifest.json",
    });
    await Assets.loadBundle("main");
    initialized = true;
  }
}
