import { createReadStream, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

const PUBLIC_PREFIX = "/tts-card-art";

/**
 * Serve gitignored TTS atlas sheets from a local cache directory.
 * Path: DDBG_TTS_CARD_ART_CACHE or <repo>/.cache/tts-card-art
 */
export function cardArtCachePlugin(repoRoot: string): Plugin {
  const cacheDir = resolve(
    process.env.DDBG_TTS_CARD_ART_CACHE || resolve(repoRoot, ".cache/tts-card-art"),
  );

  return {
    name: "ddbg-card-art-cache",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || "";
        if (!url.startsWith(`${PUBLIC_PREFIX}/`)) {
          next();
          return;
        }
        const file = decodeURIComponent(
          (url.slice(PUBLIC_PREFIX.length + 1).split("?")[0] || "").replace(/^\//, ""),
        );
        if (!file || file.includes("..") || file.includes("/") || file.includes("\\")) {
          res.statusCode = 400;
          res.end("bad path");
          return;
        }
        const abs = resolve(cacheDir, file);
        if (!abs.startsWith(cacheDir) || !existsSync(abs)) {
          res.statusCode = 404;
          res.end("card art cache miss");
          return;
        }
        const type = file.endsWith(".png")
          ? "image/png"
          : file.endsWith(".jpg") || file.endsWith(".jpeg")
            ? "image/jpeg"
            : "application/octet-stream";
        res.setHeader("Content-Type", type);
        res.setHeader("Cache-Control", "no-store");
        createReadStream(abs).pipe(res);
      });
    },
  };
}
