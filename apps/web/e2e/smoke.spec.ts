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
  // 保留另一条怪物命中路径，与种子 1 的落空一起覆盖完整怪物回合。
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
  await expect(page.getByTestId("area-B")).toContainText("Bone Soldier");
  await page.getByRole("button", { name: "结算怪物技能", exact: true }).click();
  await expect(page.getByTestId("turn-status")).toHaveText("等待抽取先攻");
  await expect(page.getByTestId("entity-hero-0")).toContainText("伤口 5/17");
});

test("位移分岔冻结其他行动，选择后续接一次并可重放", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByLabel("测试布置", { exact: true }).selectOption("shuffle");
  async function choose(seed: string, area: string) {
    await page.getByLabel("种子", { exact: true }).fill(seed);
    await page.getByRole("button", { name: "重新布置", exact: true }).click();
    await page.getByRole("button", { name: "开始战斗", exact: true }).click();
    await page.getByRole("button", { name: "抽取先攻", exact: true }).click();
    await expect(page.getByTestId("turn-status")).toContainText("HIGHWAYMAN · 剩余 2 行动");
    await page.getByLabel("技能", { exact: true }).selectOption("hero_skill:p070");
    await page.getByRole("button", { name: "使用技能", exact: true }).click();
    await expect(page.getByTestId("turn-status")).toContainText("剩余 2 行动");
    await expect(page.getByRole("button", { name: "使用技能", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "结算位移", exact: true }).click();
    const choice = page.getByRole("group", { name: "待选决策 · HIGHWAYMAN" });
    await expect(choice).toContainText("被位移：HIGHWAYMAN · 当前区域 A");
    await expect(choice.getByRole("button")).toHaveText(["区域 B", "区域 D", "区域 E"]);
    await expect(page.getByTestId("area-E")).toHaveClass(/choice-area/);
    await expect(page.getByRole("button", { name: "前往 B", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "向后换姿态", exact: true })).toBeDisabled();
    await expect(page.getByLabel("目标", { exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "抽取先攻", exact: true })).toHaveCount(0);
    await page.getByText("种子与命令调试", { exact: true }).click();
    await expect(page.getByTestId("rng-status")).toContainText("RNG 游标 5 · 命令 4");
    await page.screenshot({
      path: testInfo.outputPath(`shuffle-${seed}-${area}.png`),
      fullPage: true,
    });
    await choice.getByRole("button", { name: `区域 ${area}`, exact: true }).click();
    await expect(choice).toHaveCount(0);
    await expect(page.getByTestId("entity-hero-2")).toContainText(`区域 ${area}`);
    await expect(page.getByTestId("turn-status")).toHaveText("胜利");
    await expect(page.getByTestId("rng-status")).toContainText("RNG 游标 5 · 命令 5");
    const log = await page.getByRole("region", { name: "战斗日志" }).innerText();
    expect(log.match(/d10=/g)).toHaveLength(1);
    expect(log.match(/怪物全灭，战斗胜利/g)).toHaveLength(1);
    return log;
  }
  // 种子 5 为暴击、种子 4 为普通命中；均杀死末只怪物，但先完成自身位移。
  const first = await choose("5", "E");
  expect(await choose("5", "E")).toBe(first);
  await choose("4", "B");
});
