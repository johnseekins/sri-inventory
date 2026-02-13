import * as crypto from "crypto";

export function generateSRIHash(content: string | Buffer): string {
  const contentBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  const hash = crypto.createHash("sha384").update(contentBuffer).digest("base64");
  const sriHash = `sha384-${hash}`;

  return sriHash;
}
