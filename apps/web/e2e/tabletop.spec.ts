import { expect, test } from "@playwright/test";

test("桌面原型：选技能 → 选目标 → 确认展示 mock 骰子", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/?view=tabletop");
  await expect(page.getByTestId("tabletop-view")).toBeVisible();

  const skillId = "hero_skill:p037";
  await page.getByTestId(`card-face-${skillId}`).click();
  await page.getByTestId("tabletop-target-m0").click();
  await expect(page.getByTestId("tabletop-confirm-action")).toBeEnabled();
  await page.getByTestId("tabletop-confirm-action").click();

  const tray = page.getByTestId("tabletop-dice-tray");
  await expect(tray).toContainText("mock");
  await expect(tray).toContainText("d10=7");
});
