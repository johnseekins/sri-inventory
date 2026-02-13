import * as fs from "fs/promises";
import * as path from "path";
import { argsConverter, DOM, findFilesByExtension, generateSRIHash } from "./utils";

const FILE_NAME = "scripts-inventory.json";

/**
 * Predefined scripts that might be dynamically loaded by the application
 * These will be included in the inventory even if they're not found in the build output
 */
const PREDEFINED_SCRIPTS: ScriptInventory[] = [
  {
    name: "https://google.maps.com/some-script.js",
    type: "external",
    hash: null,
    reason: "External script - some-script.js",
  },
];

function getDefaultReason(scriptName: string): string {
  const reasons: Record<string, string> = {
    main: "Main application bundle",
    runtime: "Runtime",
    polyfills: "Browser polyfills",
    vendor: "Third-party dependencies",
    styles: "Application styles",
    gtm: "Google Tag Manager",
    analytics: "Analytics script",
    ga: "Google Analytics",
    chunk: "Lazy loaded module chunk",
    common: "Shared module chunk",
  };

  for (const [key, reason] of Object.entries(reasons)) {
    if (scriptName.toLowerCase().includes(key.toLowerCase())) {
      return reason;
    }
  }
  return "Application script";
}

/**
 * Generates an inventory of all scripts in the application's index.html and build output
 * Includes both local and external scripts with their SRI hashes where applicable
 * The inventory is saved as JSON and helps maintain PCI DSS 6.4.3 compliance
 */
export async function inventoryGenerator() {
  const { target } = argsConverter();
  const distPath = path.resolve(target);
  const indexPath = path.join(distPath, "index.html");
  const inventory: ScriptInventory[] = [...PREDEFINED_SCRIPTS];
  /** Track processed files to avoid duplicates */
  const processedFiles = new Set<string>();

  /**
   * Try to generate hashes for predefined local scripts if they exist
   */
  await Promise.all(
    inventory
      .filter((script) => script.type === "local")
      .map(async (script) => {
        try {
          const scriptPath = path.resolve(distPath, script.name);
          const fileContent = await fs.readFile(scriptPath);
          script.hash = generateSRIHash(fileContent);
          processedFiles.add(scriptPath);
        } catch (error) {
          console.warn(`Predefined local script not found: ${script.name}: ${error}`);
        }
      }),
  );

  try {
    const htmlContent = await fs.readFile(indexPath, { encoding: "utf-8" });
    const document = DOM.parseToHTML(htmlContent);
    if (!document) {
      throw new Error("Failed to parse index.html");
    }

    const scriptElements = Array.from(document.querySelectorAll("script[src]"));

    /**
     * Step 1: Process each script element from index.html
     */
    await Promise.all(
      scriptElements.map(async (script: HTMLElement) => {
        const src = script.getAttribute("src");
        if (!src) return;

        /** Skip if this script is already in predefined scripts */
        if (inventory.some((s) => s.name === src)) return;

        const isExternal = src.startsWith("http") || src.startsWith("//");
        const name = isExternal ? src : path.basename(src.split("?")[0]);

        let hash: string | null = null;
        if (!isExternal) {
          try {
            const scriptPath = path.resolve(distPath, src.replace(/^\//, ""));
            const fileContent = await fs.readFile(scriptPath);
            hash = generateSRIHash(fileContent);
            processedFiles.add(scriptPath);
          } catch (error) {
            console.warn(`Could not generate hash for ${src}:`, error);
          }
        }

        inventory.push({
          name,
          type: isExternal ? "external" : "local",
          hash,
          reason: getDefaultReason(name),
        });
      }),
    );

    /**
     * Step 2: Process any additional local JS files in the dist directory
     */
    const allJsFiles = await findFilesByExtension(distPath, ".js");

    /** Process any JS files not already processed from index.html */
    await Promise.all(
      allJsFiles.map(async (filePath) => {
        if (processedFiles.has(filePath)) return;

        const name = path.basename(filePath);
        /** Skip if this file is already in predefined scripts */
        if (inventory.some((s) => s.name === name || s.name.endsWith(name))) return;

        try {
          const fileContent = await fs.readFile(filePath);
          const hash = generateSRIHash(fileContent);

          inventory.push({
            name,
            type: "local",
            hash,
            reason: getDefaultReason(name),
          });
        } catch (error) {
          console.warn(`Could not process file ${name}:`, error);
        }
      }),
    );

    inventory.sort((a, b) => {
      /** Sort by type first (external first), then by name */
      if (a.type !== b.type) {
        return a.type === "external" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    const outputPath = path.resolve(distPath, FILE_NAME);
    await fs.writeFile(outputPath, JSON.stringify(inventory, null, 2));

    const localScripts = inventory.filter((s) => s.type === "local");
    const externalScripts = inventory.filter((s) => s.type === "external");
    const predefinedCount = PREDEFINED_SCRIPTS.length;

    console.log(`\x1b[32mScript inventory generated at ${outputPath}\x1b[0m`);
    console.log(`\x1b[33mFound ${inventory.length} total scripts (${predefinedCount} predefined):`);
    console.log(` - ${localScripts.length} local scripts (${localScripts.filter((s) => s.name.includes("chunk")).length} chunks)`);
    console.log(` - ${externalScripts.length} external scripts\x1b[0m`);
  } catch (error) {
    console.error(`\x1b[31m`);
    console.error("Error generating script inventory:", error);
    console.warn("\x1b[0m");
  }
}

type ScriptInventory = {
  name: string;
  type: "local" | "external";
  hash: string | null;
  reason: string;
};
