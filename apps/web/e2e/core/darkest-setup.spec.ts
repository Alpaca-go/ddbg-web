import { establishInitialThreatIfShown } from "./initial-threat-setup";
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("最暗任务：16房建局、开局补给及本机存档恢复", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/?seed=1");
  await page.getByTestId("embark-mode-radiant").click();
  await page.getByRole("button", { name: "前往出征准备", exact: true }).click();
  await page.getByLabel("任务卡", { exact: true }).selectOption("quest:p016");
  await page.getByRole("button", { name: "进入地牢", exact: true }).click();
  await expect(page.getByTestId("quest-card-readonly-name")).toHaveText("We Are The Flame");
  await establishInitialThreatIfShown(page);
  await page.getByRole("button", { name: "掷开局补给骰", exact: true }).click();
  const pending = page.getByTestId("dungeon-pending-choice");
  for (let i = 0; i < 12 && (await pending.count()); i++) {
    await pending.getByRole("button").first().click();
  }
  await expect(page.getByTestId("formal-dungeon-exploration")).toBeVisible();
  for (const id of "ABCDEFGHIJKLMNOP")
    await expect(page.getByTestId(`dungeon-node-${id}`)).toHaveCount(1);
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "已保存到本机" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByTestId("formal-dungeon-exploration")).toBeVisible();
  await expect(page.getByTestId("dungeon-node-P")).toHaveCount(1);
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出存档文件", exact: true }).click();
  const download = await downloadEvent;
  const exported = await readFile((await download.path())!);
  const json = JSON.parse(exported.toString("utf8"));
  expect(json.commands.some((c: { type: string }) => c.type === "rollDungeonProvisions")).toBe(
    true,
  );
  const localBefore = await page.evaluate(() => localStorage.getItem("ddbg.core-quest.save.v1"));
  const tampered = structuredClone(json);
  tampered.snapshot.dungeon.gold += 1;
  await page.getByLabel("导入存档文件", { exact: true }).setInputFiles({
    name: "tampered.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(tampered)),
  });
  // 完整日志导入还会检查可信旧目录，沿用 Boss 文件交接用例的异步预算。
  await expect(page.getByRole("status").filter({ hasText: "回放不一致" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByTestId("formal-dungeon-exploration")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("ddbg.core-quest.save.v1"))).toBe(
    localBefore,
  );
  await page.reload();
  await page.getByLabel("导入存档文件", { exact: true }).setInputFiles({
    name: download.suggestedFilename(),
    mimeType: "application/json",
    buffer: exported,
  });
  await expect(page.getByTestId("formal-dungeon-exploration")).toBeVisible();
  await expect(page.getByTestId("dungeon-node-P")).toHaveCount(1);
  expect(await page.evaluate(() => localStorage.getItem("ddbg.core-quest.save.v1"))).toBe(
    localBefore,
  );
});
