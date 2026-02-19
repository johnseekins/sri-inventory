import * as fs from "fs/promises";
import * as path from "path";
import fetch from 'node-fetch';
import { argsConverter, DOM, generateSRIHash } from "./utils";

const IGNORED_URLS: string[] = [
  // actively doesn't support SRI: https://github.com/google/fonts/issues/473
  'fonts.googleapis.com',
];

/**
 * Adds Subresource Integrity (SRI) hashes to link elements in HTML files
 */
export async function sriHashes(...files: string[]) {
  const { target } = argsConverter();
  let fileList = files;
  if (!files.length) {
    fileList = ["index.html"];
  }

  for (const file of fileList) {
    const filePath = path.resolve(target, file);
    try {
      const rootContent = await fs.readFile(filePath, { encoding: "utf-8" });

      const document = DOM.parseToHTML(rootContent);
      if (!document) {
        console.error(`Failed to parse HTML content from ${file}`);
        continue;
      }

      /**
       * Enrich elements with SRI hashes
       */
      const linkElements = Array.from(document.querySelectorAll("link,script"));
      await Promise.all(
        linkElements.map(async (el: Element) => {
          const srcData = el.getAttribute('src') || el.getAttribute('href');
          const src: string = srcData || '';
          let sriHash: string | null;
          if (!src || src.startsWith("//")) {
            console.log(`Skipping resource with no src: ${el}`);
            return;
          } else if (src.startsWith("http")) {
            const ignore = IGNORED_URLS.filter((x) => {
              return src.includes(x);
            });
            // since we're making a filtered list, any matches means we shouldn't do this endpoint
            if (ignore.length > 0) {
              console.log(`Skipping a URL that matches our filters: ${src}: ${ignore}`);
              return;
            }
            // download actual file into memory and calculate hash
            const res = await fetch(src);
            if (!res.ok) {
              console.error(`Could not download ${src} for creating sha`);
              return;
            }
            const data = await res.text();
            sriHash = generateSRIHash(data);
          } else {
            /**
             *  handle relative paths and remove query strings
             */
            sriHash = el.getAttribute("integrity");
            if (!sriHash) {
              const srcPath = path.resolve(target, src.replace(/^\//, "").replace(/\?.*$/, ""));
              const fileContent = await fs.readFile(srcPath);
              sriHash = generateSRIHash(fileContent);
            }
          }

          el.setAttribute("integrity", sriHash);
          el.setAttribute("crossorigin", "anonymous");

          console.log(`SRI hash for ${src}: ${sriHash}`);
        }),
      );

      /**
       * Save the modified document back to the file
       */
      const updatedContent = DOM.parseToString(document);
      await fs.writeFile(filePath, updatedContent);
      console.log(`SRI hashes added to ${file}`);
    } catch (error) {
      console.error(`Error reading file ${file}:`, error);
    }
  }
}
