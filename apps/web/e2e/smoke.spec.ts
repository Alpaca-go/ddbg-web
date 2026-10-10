import { expect, test } from "@playwright/test";

test("战斗沙盒加载获批数据与区域视图", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto("/");
  await expect(page).toHaveTitle("暗黑地牢桌游");
  await expect(page.getByRole("heading", { name: "暗黑地牢桌游" })).toBeVisible();
  await expect(page.getByTestId("turn-status")).toHaveText("尚未开始");
  await expect(page.getByTestId("area-A")).toContainText("4/4 格");
  await expect(page.getByTestId("area-B")).toContainText("Bone Soldier");
  await expect(page.getByTestId("entity-hero-0")).toContainText("伤口 0/17");
  await expect(page.getByTestId("area-F")).toContainText("连接：无");
  await page.screenshot({ path: testInfo.outputPath("battle-sandbox.png"), fullPage: true });
});

test("英雄射程拒绝后移动攻击，胜利停场且同种子回放一致", async ({ page }) => {
  await page.goto("/");
  async function win() {
    await page.getByRole("button", { name: "开始战斗", exact: true }).click();
    await page.getByRole("button", { name: "抽取先攻", exact: true }).click();
    // 种子 1 的首张为怪物，完成它的回合再抽到 Crusader。
    await page.getByRole("button", { name: "怪物选招与选目标", exact: true }).click();
    await page.getByRole("button", { name: "怪物移动到射程", exact: true }).click();
    await page.getByRole("button", { name: "结算怪物技能", exact: true }).click();
    await page.getByRole("button", { name: "抽取先攻", exact: true }).click();
    await expect(page.getByTestId("turn-status")).toContainText("CRUSADER · 剩余 2 行动");
    await page.getByRole("button", { name: "使用技能", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("射程");
    await expect(page.getByTestId("turn-status")).toContainText("剩余 2 行动");
    await page.getByRole("button", { name: "前往 B", exact: true }).click();
    await page.getByRole("button", { name: "确认移动", exact: true }).click();
    await expect(page.getByTestId("entity-hero-0")).toContainText("区域 B");
    await expect(page.getByTestId("turn-status")).toContainText("剩余 1 行动");
    await page.getByRole("button", { name: "使用技能", exact: true }).click();
    await expect(page.getByTestId("turn-status")).toHaveText("胜利");
    await expect(page.getByRole("button", { name: "抽取先攻", exact: true })).toHaveCount(0);
    return page.getByRole("region", { name: "战斗日志" }).innerText();
  }
  const first = await win();
  await page.getByRole("button", { name: "重新布置", exact: true }).click();
  expect(await win()).toBe(first);
});

test("怪物回合分步选招、移动与攻击不绕过引擎", async ({ page }) => {
  await page.goto("/");
  // 找一个怪物先行动的确定性种子；后续保持命令序列不变。
  await page.getByLabel("种子", { exact: true }).fill("0");
  await page.getByRole("button", { name: "重新布置", exact: true }).click();
  await page.getByRole("button", { name: "开始战斗", exact: true }).click();
  await page.getByRole("button", { name: "抽取先攻", exact: true }).click();
  await expect(page.getByTestId("turn-status")).toContainText("怪物回合");
  await page.getByRole("button", { name: "怪物选招与选目标", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "行动面板" })).toContainText(
    "技能 1 → CRUSADER",
  );
  await page.getByRole("button", { name: "怪物移动到射程", exact: true }).click();
  // Bone Soldier 技能 1 的射程为 1，留在 B 出手，不需要进入满员 A。
  await expect(page.getByTestId("area-B")).toContainText("Bone Soldier");
  await page.getByRole("button", { name: "结算怪物技能", exact: true }).click();
  await expect(page.getByTestId("turn-status")).toHaveText("等待抽取先攻");
  await expect(page.getByTestId("entity-hero-0")).toContainText("伤口 5/17");
});
