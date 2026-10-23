import { createReadStream, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Connect } from "vite";
import type { Plugin } from "vite";

const TTS_PUBLIC_PREFIX = "/tts-card-art";
const PRINT_PUBLIC_PREFIX = "/print-card-art";
const HERO_SKILL_ICON_PREFIX = "/hero-skill-icons";
const ASSETS_PLUS_PREFIX = "/ddbg-assets-plus";

const DEFAULT_ASSETS_PLUS_ROOT = "D:/ddbg-assets plus";
const DEFAULT_HERO_SKILL_ICON_ROOT = `${DEFAULT_ASSETS_PLUS_ROOT}/hero`;

function mountCacheStatic(
  middlewares: Connect.Server,
  prefix: string,
  cacheDir: string,
  allowSubdirs: boolean,
) {
  middlewares.use((req, res, next) => {
    const url = req.url || "";
    if (!url.startsWith(`${prefix}/`)) {
      next();
      return;
    }
    const raw = decodeURIComponent(
      (url.slice(prefix.length + 1).split("?")[0] || "").replace(/^\//, ""),
    );
    if (!raw || raw.includes("..")) {
      res.statusCode = 400;
      res.end("bad path");
      return;
    }
    if (!allowSubdirs && (raw.includes("/") || raw.includes("\\"))) {
      res.statusCode = 400;
      res.end("bad path");
      return;
    }
    const abs = resolve(cacheDir, raw);
    if (!abs.startsWith(cacheDir) || !existsSync(abs)) {
      res.statusCode = 404;
      res.end("card art cache miss");
      return;
    }
    const type = raw.endsWith(".png")
      ? "image/png"
      : raw.endsWith(".jpg") || raw.endsWith(".jpeg")
        ? "image/jpeg"
        : "application/octet-stream";
    res.setHeader("Content-Type", type);
    res.setHeader("Cache-Control", "no-store");
    createReadStream(abs).pipe(res);
  });
}

/**
 * Serve gitignored card art from local cache directories.
 * - Print PNGs (runtime UI): DDBG_PRINT_CARD_ART_CACHE or <repo>/.cache/print-card-art (png/… subpaths)
 * - TTS atlases (legacy / cross-check only; UI does not request these): DDBG_TTS_CARD_ART_CACHE or
 *   <repo>/.cache/tts-card-art (flat filenames from cache-tts-card-art.mjs + hero-skill-face-map.json)
 * - Hero skill icons (建队 UI): DDBG_HERO_SKILL_ICON_ROOT or D:/ddbg-assets plus/hero
 * - Kyries UI PNGs (menu 箭头等): DDBG_ASSETS_PLUS_ROOT or D:/ddbg-assets plus
 */
export function cardArtCachePlugin(repoRoot: string): Plugin {
  const ttsCacheDir = resolve(
    process.env.DDBG_TTS_CARD_ART_CACHE || resolve(repoRoot, ".cache/tts-card-art"),
  );
  const printCacheDir = resolve(
    process.env.DDBG_PRINT_CARD_ART_CACHE || resolve(repoRoot, ".cache/print-card-art"),
  );
  const assetsPlusDir = resolve(process.env.DDBG_ASSETS_PLUS_ROOT || DEFAULT_ASSETS_PLUS_ROOT);
  const heroSkillIconDir = resolve(
    process.env.DDBG_HERO_SKILL_ICON_ROOT || DEFAULT_HERO_SKILL_ICON_ROOT,
  );

  const mountAll = (middlewares: Connect.Server) => {
    mountCacheStatic(middlewares, TTS_PUBLIC_PREFIX, ttsCacheDir, false);
    mountCacheStatic(middlewares, PRINT_PUBLIC_PREFIX, printCacheDir, true);
    mountCacheStatic(middlewares, ASSETS_PLUS_PREFIX, assetsPlusDir, true);
    mountCacheStatic(middlewares, HERO_SKILL_ICON_PREFIX, heroSkillIconDir, true);
  };

  return {
    name: "ddbg-card-art-cache",
    configureServer(server) {
      mountAll(server.middlewares);
    },
    configurePreviewServer(server) {
      mountAll(server.middlewares);
    },
  };
}
