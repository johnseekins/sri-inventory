import * as fs from "fs/promises";
import * as path from "path";

/**
 * Recursively finds all  files in a directory
 */
export async function findFilesByExtension(dir: string, ext: string = ".js"): Promise<string[]> {
  const files = await fs.readdir(dir, { withFileTypes: true });
  const jsFiles: string[] = [];

  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      jsFiles.push(...(await findFilesByExtension(fullPath, ext)));
    } else if (file.name.endsWith(ext)) {
      jsFiles.push(fullPath);
    }
  }

  return jsFiles;
}
