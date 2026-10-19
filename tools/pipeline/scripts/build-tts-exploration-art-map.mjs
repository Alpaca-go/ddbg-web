#!/usr/bin/env node
/**
 * @deprecated Room tokens use print punchboard export (room-token-print-art-map.json).
 * QuestMap + ruins room cards use exploration-print-art-map.json.
 *
 * This script is kept as a stub so old docs/commands fail loudly.
 */
console.error("build-tts-exploration-art-map.mjs is deprecated: room tokens no longer use TTS.");
console.error("Use: node tools/pipeline/scripts/export-print-room-tokens.mjs --input <EN_FILES>");
console.error("Then: node tools/pipeline/scripts/build-print-room-token-art-map.mjs");
process.exit(1);
