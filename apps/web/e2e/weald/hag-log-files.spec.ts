import { expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { ssrTest } from "../core/ssr-test";

const test = ssrTest(import.meta.url);
test("Hag公开命令日志文件：导入、导出、篡改拒绝及刷新恢复", async ({ page }) => {
  test.setTimeout(180000);
  page.setDefaultTimeout(15000);
  const server = await createServer({
    configFile: fileURLToPath(new URL("../../vite.config.ts", import.meta.url)),
    configLoader: "runner",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  let payload: string;
  let releaseLabel: string;
  try {
    const { taskSources } = await server.ssrLoadModule(
      fileURLToPath(new URL("../../src/dungeon-sandbox/task-sources.ts", import.meta.url)),
    );
    const { hagUiFixture } = await server.ssrLoadModule(
      fileURLToPath(new URL("../fixtures/hag-i.ts", import.meta.url)),
    );
    const fixture = hagUiFixture(taskSources);
    if (fixture.release.battle!.pending!.type !== "hagRelease") throw new Error("缺释放待选");
    releaseLabel = fixture.release.battle!.pending!.choice.options[0]!.label;
    payload = JSON.stringify(fixture.save);
  } finally {
    await server.close();
  }
  const input = (buffer: Buffer) => ({
    name: "hag-player-log.json",
    mimeType: "application/json",
    buffer,
  });
  await page.goto("/");
  await page.getByLabel("导入存档文件", { exact: true }).setInputFiles(input(Buffer.from(payload)));
  await expect(page.getByRole("region", { name: "区域板" })).toBeVisible();
  await expect(page.getByRole("button", { name: releaseLabel, exact: true })).toBeVisible();
  const read = () =>
    page.evaluate(async () => {
      const path = "/src/dungeon-sandbox/store.ts";
      const { useDungeonStore } = await import(/* @vite-ignore */ path);
      const { game, commands } = useDungeonStore.getState();
      return { game, commands };
    });
  const loaded = await read();
  const localBefore = await page.evaluate(() => localStorage.getItem("ddbg.core-quest.save.v1"));
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出存档文件", exact: true }).click();
  const download = await downloadEvent;
  const exported = await readFile((await download.path())!);
  const json = JSON.parse(exported.toString("utf8"));
  expect(json.commands.some((c: { type: string }) => c.type === "deployHagI")).toBe(true);
  expect(json.snapshot.battle.pending.type).toBe("hagRelease");
  expect(await read()).toEqual(loaded);
  const tampered = structuredClone(json);
  tampered.snapshot.battle.rngCursor += 1;
  await page
    .getByLabel("导入存档文件", { exact: true })
    .setInputFiles(input(Buffer.from(JSON.stringify(tampered))));
  // 篡改拒绝还会核对可信旧目录；完整长日志不使用默认5秒断言预算。
  await expect(page.getByRole("status").filter({ hasText: "回放不一致" })).toBeVisible({
    timeout: 60000,
  });
  await expect(page.getByRole("button", { name: releaseLabel, exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("ddbg.core-quest.save.v1"))).toBe(
    localBefore,
  );
  expect(await read()).toEqual(loaded);
  await page.reload();
  await page.getByLabel("导入存档文件", { exact: true }).setInputFiles(input(exported));
  await expect(page.getByRole("button", { name: releaseLabel, exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("ddbg.core-quest.save.v1"))).toBe(
    localBefore,
  );
  expect(await read()).toEqual(loaded);
  await page.getByRole("button", { name: releaseLabel, exact: true }).click();
  const continued = await read();
  expect(continued.game.battle.pending).toBeNull();
  expect(continued.game.battle.hagCauldron).toBeUndefined();
  expect(continued.game.battle.rngCursor).toBe(loaded.game.battle.rngCursor);
  expect(continued.commands).toHaveLength(loaded.commands.length + 1);
});
