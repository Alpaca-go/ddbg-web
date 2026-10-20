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

test("桌面原型：阶段导航与 mock 阶段切换", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/?view=tabletop");

  await expect(page.getByTestId("phase-breadcrumb")).toBeVisible();
  await expect(page.getByTestId("phase-crumb-battle")).toHaveAttribute("aria-current", "step");
  await expect(page.getByTestId("dungeon-checkpoint")).toBeVisible();

  await page
    .getByTestId("debug-drawer")
    .getByRole("button", { name: /调试选项/ })
    .click();
  await page.getByTestId("tabletop-demo-phase").selectOption("hamlet");

  await expect(page.getByTestId("phase-crumb-hamlet")).toHaveAttribute("aria-current", "step");
  await expect(page.getByTestId("tabletop-center-phase-ph")).toBeVisible();
  await expect(page.getByTestId("tabletop-effective-phase")).toContainText("hamlet");

  await page.getByTestId("tabletop-demo-phase").selectOption("dungeonExploration");
  await expect(page.getByTestId("phase-crumb-dungeonExploration")).toHaveAttribute(
    "aria-current",
    "step",
  );
  await expect(page.getByTestId("tabletop-dungeon-stage")).toBeVisible();
});
