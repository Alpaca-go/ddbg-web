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

test("桌面原型：引擎战斗左栏显示真实英雄名与伤口", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/?view=tabletop&engine=battle");
  const party = page.getByTestId("tabletop-party");
  await expect(party).toHaveAttribute("data-source", "engine");
  const crusader = page.getByTestId("tabletop-hero-row-hero-0");
  await expect(crusader).toContainText("CRUSADER");
  await expect(crusader).toContainText("伤口 0/");
});

test("桌面原型：阶段导航与 mock 阶段切换", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/?view=tabletop");

  await expect(page.getByTestId("phase-breadcrumb")).toBeVisible();
  await expect(page.getByTestId("phase-crumb-battle")).toHaveAttribute("aria-current", "step");
  await expect(page.getByTestId("dungeon-checkpoint")).toBeVisible();
  await expect(page.getByTestId("debug-drawer-body")).toHaveCount(0);

  await page
    .getByTestId("debug-drawer")
    .getByRole("button", { name: /^调试选项$/ })
    .click();
  await expect(page.getByTestId("debug-drawer-body")).toBeVisible();
  await page.getByTestId("tabletop-demo-phase").selectOption("hamlet");

  await expect(page.getByTestId("phase-crumb-hamlet")).toHaveAttribute("aria-current", "step");
  await expect(page.getByTestId("tabletop-hamlet-stage")).toBeVisible();
  await expect(page.getByTestId("tabletop-hamlet-board")).toBeVisible();
  await expect(page.getByTestId("tabletop-effective-phase")).toContainText("hamlet");

  await page.getByTestId("tabletop-demo-phase").selectOption("dungeonExploration");
  await expect(page.getByTestId("phase-crumb-dungeonExploration")).toHaveAttribute(
    "aria-current",
    "step",
  );
  await expect(page.getByTestId("tabletop-dungeon-stage")).toBeVisible();
});

test("桌面原型：右栏详情切换英雄与怪物", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/?view=tabletop");
  await expect(page.getByTestId("tabletop-detail-phase-hint")).toBeVisible();

  await page.getByTestId("tabletop-target-m0").click();
  await expect(page.getByTestId("tabletop-detail-monster")).toBeVisible();
  await expect(page.getByTestId("tabletop-detail-monster-skill")).toContainText("d10=4");

  await page.getByTestId("tabletop-hero-row-hero-1").click();
  await expect(page.getByTestId("tabletop-detail-hero")).toBeVisible();
  await expect(page.getByTestId("tabletop-detail-hero-status")).toBeVisible();
});

test("桌面原型：demoPhase 查询参数且调试抽屉默认收起", async ({ page }) => {
  await page.goto("/?view=tabletop&demoPhase=hamlet");
  await expect(page.getByTestId("tabletop-hamlet-stage")).toBeVisible();
  await expect(page.getByTestId("debug-drawer-body")).toHaveCount(0);
});

test("桌面原型：顶栏任务缩略图切换任务详情", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/?view=tabletop");
  await page.getByTestId("tabletop-quest-thumb").getByRole("button").click();
  await expect(page.getByTestId("tabletop-detail-quest")).toBeVisible();
  await expect(page.getByTestId("tabletop-detail-quest")).toContainText("Scout Ahead I");
});

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
]) {
  test(`T4：${viewport.width} 战斗区域、姿态和真实先攻投影`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/?view=tabletop&engine=battle");
    await expect(page.getByTestId("tabletop-turn-actor")).toHaveText("尚未开始战斗");
    await expect(page.getByTestId("tabletop-stance-hero")).toBeVisible();
    await expect(page.getByTestId("tabletop-stance-monster-aggressive")).toContainText(
      "Bone Soldier",
    );
    await expect(page.getByTestId("tabletop-area-A")).toContainText("CRUSADER");
    await page.getByTestId("tabletop-stance-monster-aggressive").getByRole("button").click();
    await expect(page.getByTestId("tabletop-detail-monster")).toBeVisible();
    await page.evaluate(async () => {
      const moduleUrl = "/src/battle-store.ts";
      const { useBattleStore } = await import(/* @vite-ignore */ moduleUrl);
      const expectedAreas = useBattleStore
        .getState()
        .game.battle.areas.map((area: { id: string }) => area.id);
      const displayedAreas = [...document.querySelectorAll(".tt-battle-area")].map((el) =>
        el.getAttribute("data-testid")?.replace("tabletop-area-", ""),
      );
      if (JSON.stringify(displayedAreas) !== JSON.stringify(expectedAreas))
        throw new Error("区域列表与引擎不一致");
      useBattleStore.getState().dispatch({ type: "startBattle" });
      useBattleStore.getState().dispatch({ type: "drawInitiative" });
    });
    await expect(page.getByTestId("tabletop-turn-actor")).toContainText("回合");
    await expect(
      page.getByTestId("tabletop-initiative-revealed").locator(".tt-init__card"),
    ).toHaveCount(1);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    for (const id of ["tabletop-battle-board", "tabletop-initiative", "tabletop-stance-hero"]) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    }
  });
}
