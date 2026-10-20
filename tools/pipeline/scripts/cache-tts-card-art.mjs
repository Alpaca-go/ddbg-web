#!/usr/bin/env node
/**
 * Download TTS FaceURL (and optional BackURL) atlas sheets referenced by the
 * committed hero-skill face map into a gitignored local cache.
 *
 * Usage:
 *   node tools/pipeline/scripts/cache-tts-card-art.mjs
 *   DDBG_TTS_CARD_ART_CACHE=/path/to/cache node tools/pipeline/scripts/cache-tts-card-art.mjs
 *
 * Default cache: <repo>/.cache/tts-card-art/
 * Files: face-<deckId>.png, back-<deckId>.png (extension from Content-Type / URL).
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";

const root = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const heroMapPath = resolve(root, "apps/web/src/card-art/hero-skill-face-map.json");
const cacheDir = resolve(
  process.env.DDBG_TTS_CARD_ART_CACHE || resolve(root, ".cache/tts-card-art"),
);

const heroMap = JSON.parse(readFileSync(heroMapPath, "utf8"));
mkdirSync(cacheDir, { recursive: true });

async function download(url, destBase) {
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const type = res.headers.get("content-type") || "";
  const ext = type.includes("png")
    ? ".png"
    : type.includes("jpeg") || type.includes("jpg")
      ? ".jpg"
      : url.includes(".png")
        ? ".png"
        : ".img";
  const dest = `${destBase}${ext}`;
  if (existsSync(dest)) {
    console.log(`skip ${dest}`);
    return dest;
  }
  await pipeline(res.body, createWriteStream(dest));
  console.log(`saved ${dest}`);
  return dest;
}

const jobs = [];
for (const [deckId, atlas] of Object.entries(heroMap.atlases || {})) {
  jobs.push(download(atlas.faceUrl, resolve(cacheDir, `face-${deckId}`)));
  if (atlas.backUrl) {
    jobs.push(download(atlas.backUrl, resolve(cacheDir, `back-${deckId}`)));
  }
}
const results = await Promise.allSettled(jobs);
const failed = results.filter((r) => r.status === "rejected");
console.log(`Cache dir: ${cacheDir}`);
console.log(`Done: ${results.length - failed.length} ok, ${failed.length} failed`);
if (failed.length) {
  for (const f of failed) console.error(f.reason);
  process.exit(1);
}
console.log(
  `Point Vite at this dir via DDBG_TTS_CARD_ART_CACHE (see docs/phase4-card-art-faces-2026-10-18.md).`,
);
