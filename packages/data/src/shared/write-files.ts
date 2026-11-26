import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DATA_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function readDataJson(file: string): unknown {
  return JSON.parse(readFileSync(path.join(DATA_ROOT, file), "utf8")) as unknown;
}

export function writeDataFiles(outputDir: string, files: Readonly<Record<string, unknown>>): void {
  mkdirSync(outputDir, { recursive: true });
  for (const [name, file] of Object.entries(files)) {
    writeFileSync(path.join(outputDir, name), `${JSON.stringify(file, null, 1)}\n`);
  }
}
