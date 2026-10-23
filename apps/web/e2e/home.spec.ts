import { expect, test } from "@playwright/test";

test("首页：四人建队可开始任务，旧沙盒与桌面预览保留入口", async ({ page }, testInfo) => {
  await page.goto("/");
  for (const width of [1280, 1920]) {
    await page.setViewportSize({ width, height: width === 1280 ? 800 : 1080 });
    expect(await page.getByTestId("tabletop-gold").innerText()).toBe("—");
    await expect(page.getByTestId("tabletop-party")).toHaveCount(0);
    await expect(page.getByTestId("embark-party-grid")).toBeVisible();
    await expect(page.getByTestId("embark-party-roster")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(overflow).toBe(false);
    await expect(page.getByTestId("tabletop-action-dock")).toHaveCount(0);
  }
  await expect(page.getByTestId("tabletop-view")).toBeVisible();
  await expect(page.getByTestId("phase-crumb-questSetup")).toHaveAttribute("aria-current", "step");
  await expect(page.getByRole("heading", { name: "开局建队", exact: true })).toBeVisible();
  for (let seat = 1; seat <= 4; seat++) {
    await expect(page.getByLabel(`席位 ${seat} 英雄`, { exact: true })).toBeVisible();
    await expect(page.getByTestId(`embark-hero-prev-${seat - 1}`)).toBeVisible();
    await expect(page.getByTestId(`embark-hero-next-${seat - 1}`)).toBeVisible();
  }
  await page.getByRole("link", { name: "打开战斗沙盒" }).click();
  await expect(page).toHaveURL(/view=battle/);
  await expect(page.getByTestId("turn-status")).toHaveText("尚未开始");
  await page.goto("/");
  await expect(page.getByLabel("任务卡", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "前往出征准备", exact: true }).click();
  await expect(page.getByTestId("tabletop-detail-hero")).toBeVisible();
  for (const width of [1280, 1920]) {
    await page.setViewportSize({ width, height: width === 1280 ? 800 : 1080 });
    const layout = await page.getByTestId("tabletop-party").evaluate((party) => ({
      bottom: party.getBoundingClientRect().bottom,
      rows: [...party.querySelectorAll("button")].map((row) => row.getBoundingClientRect().bottom),
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    expect(layout.rows).toHaveLength(4);
    expect(layout.rows.every((bottom) => bottom <= layout.bottom)).toBe(true);
    expect(layout.overflow).toBe(false);
    await page.getByTestId("tabletop-hero-row-hero-0").click();
    await expect(page.getByTestId("tabletop-detail")).toBeInViewport();
    await page.keyboard.press("Escape");
  }
  const hero = page.getByTestId("tabletop-hero-row-hero-0");
  await expect(page.getByTestId("tabletop-detail")).toHaveCount(0);
  await hero.click();
  await page.getByRole("button", { name: "关闭详情", exact: true }).click();
  await expect(hero).toBeFocused();
  await hero.click();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("tabletop-detail")).toHaveCount(0);
  await expect(hero).toBeFocused();
  await page.getByRole("button", { name: "日志", exact: true }).click();
  await expect(page.getByRole("region", { name: "日志抽屉" })).toHaveText("暂无事件记录");
  await page.getByRole("button", { name: "日志", exact: true }).click();
  await expect(page.getByRole("heading", { name: "出征准备", exact: true })).toBeVisible();
  await expect(page.getByTestId("tabletop-party")).not.toContainText(/buff|protection|mark/);
  await expect(page.getByTestId("tabletop-gold")).toHaveText("—");
  await expect(page.getByTestId("tabletop-top-bar")).not.toContainText(/占位|8\/16|柴火 2/);
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
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole("button", { name: "掷开局补给骰", exact: true }).click();
  const pending = page.getByTestId("dungeon-pending-choice");
  const prompt = await pending.locator("p").first().innerText();
  const options = await pending.getByRole("button").allTextContents();
  await page.getByTestId("tabletop-hero-row-hero-0").click();
  const pendingBox = await pending.boundingBox();
  const detailBox = await page.getByTestId("tabletop-detail").boundingBox();
  expect(pendingBox!.x + pendingBox!.width).toBeLessThanOrEqual(detailBox!.x);
  await page.getByRole("button", { name: "关闭详情", exact: true }).click();
  await expect(pending.locator("p").first()).toHaveText(prompt);
  expect(await pending.getByRole("button").allTextContents()).toEqual(options);
  await page.goto("/?view=tabletop");
  await expect(page.getByTestId("tabletop-view")).toBeVisible();
});
