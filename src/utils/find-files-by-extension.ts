import * as fs from "fs/promises";
import * as path from "path";

/**
 * Recursively finds all files in a directory with a given extension
 */
export async function findFilesByExtension(dir: string, ext: string = ".js"): Promise<string[]> {
  const files = await fs.readdir(dir, { withFileTypes: true });
  const matchingFiles: string[] = [];

  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      matchingFiles.push(...(await findFilesByExtension(fullPath, ext)));
    } else if (file.name.endsWith(ext)) {
      matchingFiles.push(fullPath);
    }
  }

  return matchingFiles;
}
