import { establishInitialThreatIfShown } from "./initial-threat-setup";
import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

test("UX-02A：正式探索地图优先布局与顶栏资源", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  page.setDefaultTimeout(10_000);
  const shotDir = join(process.cwd(), "..", "..", "docs", "screenshots");
  mkdirSync(shotDir, { recursive: true });

  await page.goto("/");
  const click = (name: string) => page.getByRole("button", { name, exact: true }).click();
  await page.getByTestId("embark-mode-radiant").click();
  await click("前往出征准备");
  await click("进入地牢");
  await establishInitialThreatIfShown(page);
  await click("掷开局补给骰");
  const choice = page.getByTestId("dungeon-pending-choice");
  for (let step = 0; step < 40; step++) {
    if (await page.getByTestId("formal-dungeon-exploration").count()) break;
    if (await choice.count()) {
      await choice.getByRole("button").first().click();
      continue;
    }
    const scout = page.getByRole("button", { name: "侦察", exact: true });
    if ((await scout.count()) && (await scout.isEnabled())) {
      await scout.click();
      continue;
    }
    throw new Error(await page.getByTestId("tabletop-formal-center").innerText());
  }

  await expect(page.getByTestId("formal-dungeon-exploration")).toBeVisible();
  await expect(page.getByTestId("quest-map-frame")).toBeVisible();
  await expect(page.getByTestId("tabletop-provision-count")).toContainText("/16");
  await expect(page.getByTestId("dungeon-exploration-decisions")).toBeVisible();
  await expect(page.getByTestId("dungeon-exploration-commands")).toBeVisible();

  for (const { width, height, tag } of [
    { width: 1280, height: 800, tag: "1280" },
    { width: 1920, height: 1080, tag: "1920" },
  ]) {
    await page.setViewportSize({ width, height });
    await page.screenshot({
      path: join(shotDir, `ux02a-${tag}-exploration.png`),
    });
    await page.screenshot({
      path: testInfo.outputPath(`ux02a-exploration-${tag}.png`),
    });
  }
});
