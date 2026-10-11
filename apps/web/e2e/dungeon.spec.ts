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
