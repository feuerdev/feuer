import * as fs from "fs";
import * as path from "path";

// Configuration
const publicFolderPath = path.join(process.cwd(), "public");
const manifestOutputPath = path.join(publicFolderPath, "manifest.json");
const bundleName = "images";

// Function to check if a file is an image (excluding .ico files)
function isImageFile(filePath: string): boolean {
  const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];
  const ext = path.extname(filePath).toLowerCase();
  return imageExtensions.includes(ext) && ext !== ".ico";
}

// Function to get all image files from a directory recursively
function getImageFiles(dir: string): string[] {
  const files: string[] = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...getImageFiles(fullPath));
    } else if (isImageFile(fullPath)) {
      // Get path relative to public folder
      const relativePath = path.relative(publicFolderPath, fullPath);
      files.push(relativePath);
    }
  }

  return files;
}

// Generate the manifest
function generateManifest() {
  console.log("Generating PixiJS asset manifest...");

  try {
    // Get all image files
    const imageFiles = getImageFiles(publicFolderPath);

    // Create the manifest object according to PixiJS format
    const manifest = {
      bundles: [
        {
          name: bundleName,
          assets: imageFiles.reduce(
            (acc: Record<string, { src: string }>, file: string) => {
              // The asset key will be the filename without extension
              const key = path.basename(file, path.extname(file));
              acc[key] = {
                src: file,
              };
              return acc;
            },
            {}
          ),
        },
      ],
    };

    // Write the manifest file
    fs.writeFileSync(manifestOutputPath, JSON.stringify(manifest, null, 2));

    console.log(`Successfully created manifest at ${manifestOutputPath}`);
    console.log(
      `Added ${imageFiles.length} images to the "${bundleName}" bundle`
    );
  } catch (error) {
    console.error("Error generating manifest:", error);
    process.exit(1);
  }
}

// Run the generator
generateManifest();
