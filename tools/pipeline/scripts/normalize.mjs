import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = new URL("../../../", import.meta.url);
const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(new URL("node_modules/vitest/vitest.mjs", root)),
    "run",
    "../../../packages/data/tests/core/misc/normalize.build.test.ts",
    "../../../packages/data/tests/weald/monsters/weald-monsters.build.test.ts",
    "../../../packages/data/tests/weald/curios/weald-curios.build.test.ts",
    "../../../packages/data/tests/weald/quests/weald-higher-quests.build.test.ts",
  ],
  {
    cwd: fileURLToPath(root),
    env: { ...process.env, WRITE_NORMALIZED: "1" },
    stdio: "inherit",
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
