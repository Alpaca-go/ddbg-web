import { expect, test } from "@playwright/test";

test("最暗任务：16房建局、开局补给及本机存档恢复", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/?seed=1");
  await page.getByTestId("embark-mode-radiant").click();
  await page.getByRole("button", { name: "前往出征准备", exact: true }).click();
  await page.getByLabel("任务卡", { exact: true }).selectOption("quest:p016");
  await page.getByRole("button", { name: "进入地牢", exact: true }).click();
  await expect(page.getByTestId("quest-card-readonly-name")).toHaveText("We Are The Flame");
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
});
