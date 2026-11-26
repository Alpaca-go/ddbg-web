import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = new URL("../../../", import.meta.url);
const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(new URL("node_modules/vitest/vitest.mjs", root)),
    "run",
    "packages/data/tests/shared/normalize.build.test.ts",
    "packages/data/tests/weald/monsters/monsters.build.test.ts",
    "packages/data/tests/weald/curios/curio.build.test.ts",
    "packages/data/tests/weald/quests/quest-cards.build.test.ts",
    "packages/data/tests/weald/quests/higher-quests.build.test.ts",
    "packages/data/tests/weald/rooms/room.build.test.ts",
    "packages/data/tests/weald/rooms/stygian-rooms.build.test.ts",
    "packages/data/tests/cove/curios/curio.build.test.ts",
    "packages/data/tests/cove/rooms/room.build.test.ts",
  ],
  {
    cwd: fileURLToPath(root),
    env: { ...process.env, WRITE_NORMALIZED: "1" },
    stdio: "inherit",
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
