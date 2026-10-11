import { expect, test } from "@playwright/test";

test("Phase 3：侦察同意、隐蔽信息、Radiant 减骰与结算停点", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto("/");
  await page.getByRole("link", { name: "打开 Phase 3 布局与侦察沙盒" }).click();
  await expect(page.getByRole("heading", { name: "地牢布局与侦察" })).toBeVisible();
  await expect(page.getByTestId("dungeon-node-D")).toContainText("未揭示");
  await page.getByRole("button", { name: "侦察", exact: true }).click();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(page.getByTestId("dungeon-pressure")).toContainText("hero-0 压力 0");
  await page.getByRole("button", { name: "重置 Radiant" }).click();
  await page.getByRole("button", { name: "侦察", exact: true }).click();
  await page.getByRole("button", { name: "全员同意", exact: true }).click();
  await expect(page.getByTestId("dungeon-pressure")).toContainText("hero-3 压力 1");
  await expect(page.getByTestId("dungeon-node-D")).not.toContainText("未揭示");
  await expect(page.getByTestId("dungeon-node-A")).toContainText("未揭示");
  await expect(page.getByTestId("dungeon-bonus")).toContainText("每人 0 骰");
  await page.getByRole("button", { name: "选择下一段探索" }).click();
  await page.getByRole("button", { name: "D", exact: true }).click();
  await expect(page.getByTestId("dungeon-checkpoint")).toContainText(
    "每人 0 骰 · 等待危险结算，队伍尚未移动",
  );
  await expect(page.getByRole("button", { name: "侦察", exact: true })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath("dungeon-checkpoint.png"), fullPage: true });
});

test("侦察压力 10 完成意志检定；已有意志卡直接心脏病停场", async ({ page }) => {
  await page.goto("/?phase=3");
  await page.getByLabel("侦察测试布置").selectOption("pressure");
  await page.getByRole("button", { name: "侦察", exact: true }).click();
  await page.getByRole("button", { name: "全员同意", exact: true }).click();
  await expect(page.getByTestId("dungeon-pressure")).toContainText("hero-0 压力 0 · 意志卡");
  await expect(page.getByTestId("dungeon-events")).toContainText("d10 8");
  await expect(page.getByTestId("dungeon-node-D")).not.toContainText("未揭示");
  await expect(page.getByRole("button", { name: "选择下一段探索" })).toBeEnabled();
  await page.getByLabel("侦察测试布置").selectOption("heartAttack");
  await page.getByRole("button", { name: "侦察", exact: true }).click();
  await page.getByRole("button", { name: "全员同意", exact: true }).click();
  await expect(page.getByTestId("dungeon-pressure")).toContainText("hero-0 压力 10（心脏病死亡）");
  await expect(page.getByTestId("dungeon-checkpoint")).toContainText("等待驿站替换接口");
  await expect(page.getByTestId("dungeon-node-D")).toContainText("未揭示");
  await expect(page.getByRole("button", { name: "侦察", exact: true })).toBeDisabled();
});

test("实际地图灰点遮挡，红边地图保留未解释标记且仅预览", async ({ page }, testInfo) => {
  await page.goto("/?phase=3");
  await page.getByLabel("地图页码").selectOption("3");
  await expect(page.getByTestId("dungeon-node-X")).toContainText("灰点");
  await page.getByRole("button", { name: "侦察", exact: true }).click();
  await page.getByRole("button", { name: "全员同意", exact: true }).click();
  await expect(page.getByTestId("dungeon-node-D")).toContainText("未揭示");
  await page.getByLabel("地图页码").selectOption("11");
  await expect(page.getByTestId("dungeon-node-X")).toContainText("待确认");
  await expect(page.getByRole("heading", { name: "侦察流程", exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("map11-preview.png"), fullPage: true });
  await page.getByLabel("地图页码").selectOption("12");
  await expect(page.getByTestId("dungeon-node-A")).toContainText("待确认");
  await page.screenshot({ path: testInfo.outputPath("map12-preview.png"), fullPage: true });
  await page.getByLabel("地图页码").selectOption("1");
  await expect(page.getByTestId("dungeon-pressure")).toContainText("hero-0 压力 0");
});
