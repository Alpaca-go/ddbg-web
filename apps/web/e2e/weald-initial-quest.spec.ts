import { expect, test } from "@playwright/test";

test("Weald 首趟抽 2 选 1、锁定抽法、出征后刷新恢复", async ({ page }, testInfo) => {
  await page.goto("/?seed=2");
  await page.getByTestId("content-pack-weald").check();
  await page.getByRole("button", { name: "前往出征准备", exact: true }).click();
  await expect(page.getByRole("button", { name: "进入地牢", exact: true })).toBeDisabled();
  await page
    .getByRole("combobox", { name: "首趟任务抽法" })
    .selectOption("hamlet-quest-draw:weald-two");
  await page.getByRole("button", { name: "抽取首趟任务", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "首趟任务抽法" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "抽取首趟任务", exact: true })).toBeDisabled();
  const quests = page.getByRole("combobox", { name: "任务卡", exact: true });
  await expect(quests.locator("option")).toHaveCount(2);
  const ids = await quests
    .locator("option")
    .evaluateAll((options) => options.map((o) => (o as HTMLOptionElement).value));
  expect(ids.every((id) => id.startsWith("quest:weald:"))).toBe(true);
  await quests.selectOption(ids[1]!);
  await page.screenshot({ path: testInfo.outputPath("weald-initial-draw.png"), fullPage: true });
  await page.getByRole("button", { name: "进入地牢", exact: true }).click();
  await expect(page.getByTestId("campaign-active-packs")).toContainText("Weald");
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("已保存");
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByTestId("campaign-active-packs")).toContainText("Weald");
});
