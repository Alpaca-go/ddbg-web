import { expect, test } from "@playwright/test";

test("首页：四人建队可开始任务，旧沙盒与桌面预览保留入口", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("tabletop-view")).toBeVisible();
  await expect(page.getByTestId("phase-crumb-questSetup")).toHaveAttribute("aria-current", "step");
  await expect(page.getByRole("heading", { name: "开局建队", exact: true })).toBeVisible();
  for (let seat = 1; seat <= 4; seat++) {
    await expect(page.getByLabel(`席位 ${seat} 英雄`, { exact: true })).toBeVisible();
  }
  await page.getByRole("link", { name: "打开战斗沙盒" }).click();
  await expect(page).toHaveURL(/view=battle/);
  await expect(page.getByTestId("turn-status")).toHaveText("尚未开始");
  await page.goto("/");
  await expect(page.getByLabel("任务卡", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "前往出征准备", exact: true }).click();
  await expect(page.getByRole("heading", { name: "出征准备", exact: true })).toBeVisible();
  const questName = await page
    .getByLabel("任务卡", { exact: true })
    .locator("option:checked")
    .innerText();
  await page.getByRole("button", { name: "进入地牢", exact: true }).click();
  await expect(page.getByTestId("tabletop-view")).toBeVisible();
  await expect(page.getByTestId("phase-crumb-expeditionPrep")).toHaveAttribute(
    "aria-current",
    "step",
  );
  await expect(page.getByRole("heading", { name: questName, exact: true })).toBeVisible();
  await page.goto("/?view=tabletop");
  await expect(page.getByTestId("tabletop-view")).toBeVisible();
});
