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
  await page.getByLabel("侦察测试布置").selectOption("corridor");
  await page.getByRole("button", { name: "重置标准模式" }).click();
  await page.getByRole("button", { name: "选择下一段探索" }).click();
  await page.getByRole("button", { name: "D", exact: true }).click();
  await page.getByRole("button", { name: "掷探索骰并开始结算" }).click();
  // 真实种子 31 的八骰；同一英雄可先结算第二颗。
  await page.getByRole("button", { name: "hero-0:2 · Trap", exact: true }).click();
  await page
    .getByRole("button", { name: "陷阱攻击（缩放 / 光照待 Kyries 确认）", exact: true })
    .click();
  await expect(page.getByTestId("dungeon-checkpoint")).toContainText("队伍尚未移动");
  await expect(page.getByTestId("dungeon-provisions")).toContainText("tool-1");
  await page.getByRole("button", { name: "使用 tool（tool-1）抵消", exact: true }).click();
  const sequence = [
    "hero-0:1 · Stressful Darkness",
    "使用 torch（torch-1）抵消",
    "hero-1:1 · 空白",
    "hero-1:2 · Rubble",
    "使用 tool（tool-2）抵消",
    "hero-2:1 · Trap",
    "使用 tool（tool-3）抵消",
    "hero-2:2 · 空白",
    "hero-3:1 · Hunger",
    "使用 food（food-1）抵消",
    "hero-3:2 · Trap",
    "使用 tool（tool-4）抵消",
  ];
  for (const name of sequence) await page.getByRole("button", { name, exact: true }).click();
  await expect(page.getByTestId("dungeon-checkpoint")).toContainText("已到达 D；Empty 已清理");
  await expect(page.getByTestId("dungeon-node-D")).toContainText("已清理 · 无代币");
  await expect(page.getByTestId("dungeon-rolls")).not.toContainText("待结算");
  await expect(page.getByTestId("dungeon-provisions")).toHaveText("剩余补给：无");
  await expect(page.getByRole("button", { name: "侦察", exact: true })).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath("dungeon-empty.png"), fullPage: true });
  await page.getByRole("button", { name: "原路返回", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "返回 G（全员压力 +1）", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "取消返回", exact: true }).click();
  await expect(page.getByTestId("dungeon-pressure")).toContainText("hero-0 压力 0");
  await page.getByRole("button", { name: "原路返回", exact: true }).click();
  await page.getByRole("button", { name: "返回 G（全员压力 +1）", exact: true }).click();
  await expect(page.getByTestId("dungeon-checkpoint")).toContainText("已到达 G");
  await expect(page.getByTestId("dungeon-pressure")).toContainText("hero-0 压力 1");
  await expect(page.getByTestId("dungeon-pressure")).toContainText("hero-3 压力 1");
  await expect(page.getByTestId("dungeon-rolls")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "掷探索骰并开始结算" })).toHaveCount(0);
  await expect(page.getByText(/布置 RNG 游标 15/)).toBeVisible();
  await page.getByRole("button", { name: "原路返回", exact: true }).click();
  await page.getByRole("button", { name: "返回 D（全员压力 +1）", exact: true }).click();
  await expect(page.getByTestId("dungeon-checkpoint")).toContainText("已到达 D");
  await expect(page.getByTestId("dungeon-pressure")).toContainText("hero-0 压力 2");
  await expect(page.getByTestId("dungeon-node-D")).toContainText("已清理 · 无代币");
  await expect(page.getByTestId("dungeon-provisions")).toHaveText("剩余补给：无");
  await expect(page.getByText(/布置 RNG 游标 15/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("dungeon-backtrack.png"), fullPage: true });
  await page.getByLabel("侦察测试布置").selectOption("curio");
  await page.getByRole("button", { name: "选择下一段探索" }).click();
  await page.getByRole("button", { name: "D", exact: true }).click();
  await page.getByRole("button", { name: "掷探索骰并开始结算" }).click();
  await page.getByRole("button", { name: "hero-0:1 · Curio", exact: true }).click();
  await expect(page.getByTestId("dungeon-curio")).toHaveCount(0);
  await page
    .getByRole("button", { name: "使用 torch（torch-1），抽卡前抑制负面效果", exact: true })
    .click();
  await expect(page.getByTestId("dungeon-curio")).toContainText("Sarcophagus · p21");
  await expect(page.getByTestId("dungeon-curio")).toContainText("抽卡前 已使用 Torch");
  await expect(page.getByTestId("dungeon-provisions")).not.toContainText("torch-1");
  await page.getByRole("button", { name: "结算当前 Curio" }).click();
  await expect(page.getByTestId("dungeon-gold")).toHaveText("共享金币：10");
  const curioSequence = [
    "hero-0:2 · Rubble",
    "使用 tool（tool-1）抵消",
    "hero-1:1 · 空白",
    "hero-1:2 · Hunger",
    "使用 food（food-1）抵消",
    "hero-2:1 · Rubble",
    "使用 tool（tool-2）抵消",
    "hero-2:2 · Stressful Darkness",
    "承受 2 压力",
    "hero-3:1 · Rubble",
    "使用 tool（tool-3）抵消",
    "hero-3:2 · Rubble",
    "使用 tool（tool-4）抵消",
  ];
  for (const name of curioSequence) await page.getByRole("button", { name, exact: true }).click();
  await expect(page.getByTestId("dungeon-checkpoint")).toContainText("已到达 D；Empty 已清理");
  await expect(page.getByTestId("dungeon-curio")).toContainText("弃牌 1");
  await page.screenshot({ path: testInfo.outputPath("curio-empty.png"), fullPage: true });
});

test("侦察压力 10 完成意志检定；已有意志卡直接心脏病停场", async ({ page }, testInfo) => {
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
  await page.getByLabel("侦察测试布置").selectOption("curio");
  await page.getByRole("button", { name: "选择下一段探索" }).click();
  await page.getByRole("button", { name: "D", exact: true }).click();
  await page.getByRole("button", { name: "掷探索骰并开始结算" }).click();
  await page.getByRole("button", { name: "hero-0:1 · Curio", exact: true }).click();
  await page.getByRole("button", { name: "不用 Torch，抽 Curio", exact: true }).click();
  await page.getByRole("button", { name: "结算当前 Curio" }).click();
  await expect(page.getByTestId("dungeon-curio")).toContainText("疾病牌堆 / 施加接口尚未接线");
  await expect(page.getByTestId("dungeon-gold")).toHaveText("共享金币：0");
  await expect(page.getByTestId("dungeon-provisions")).toContainText("torch-1");
  await expect(page.getByTestId("dungeon-checkpoint")).toContainText("不能补用 Torch 或重抽");
  await page.getByLabel("侦察测试布置").selectOption("trap");
  await page.getByRole("button", { name: "重置 Radiant" }).click();
  await page.getByRole("button", { name: "侦察", exact: true }).click();
  await page.getByRole("button", { name: "全员同意", exact: true }).click();
  await page.getByRole("button", { name: "选择下一段探索" }).click();
  await page.getByRole("button", { name: "D", exact: true }).click();
  await page.getByRole("button", { name: "掷探索骰并开始结算" }).click();
  await expect(page.getByTestId("dungeon-checkpoint")).toContainText("Trap 分配，保留代币");
  await page.getByRole("button", { name: "结算 Trap 房间", exact: true }).click();
  await page.getByRole("button", { name: "hero-0：分配陷阱房 3 点", exact: true }).click();
  await page.getByRole("button", { name: "1 伤口 + 2 压力", exact: true }).click();
  await expect(page.getByTestId("dungeon-events")).toContainText("Q-64");
  await expect(page.getByTestId("dungeon-pressure")).toContainText("hero-0 压力 9 · 伤口 0/17");
  await page.getByRole("button", { name: "0 伤口 + 3 压力", exact: true }).click();
  await expect(page.getByTestId("dungeon-pressure")).toContainText("hero-0 压力 0 · 意志卡");
  await expect(page.getByRole("button", { name: "原路返回", exact: true })).toBeDisabled();
  for (const [hero, allocation] of [
    [1, "1 伤口 + 2 压力"],
    [2, "3 伤口 + 0 压力"],
    [3, "0 伤口 + 3 压力"],
  ] as const) {
    await page.getByRole("button", { name: `hero-${hero}：分配陷阱房 3 点`, exact: true }).click();
    await page.getByRole("button", { name: allocation, exact: true }).click();
  }
  await expect(page.getByTestId("dungeon-room-resolution")).toContainText("全员完成，保留代币");
  await expect(page.getByTestId("dungeon-node-D")).toContainText("陷阱");
  await expect(page.getByTestId("dungeon-node-D")).not.toContainText("已清理");
  for (const target of ["G", "D"]) {
    await page.getByRole("button", { name: "原路返回", exact: true }).click();
    await page.getByRole("button", { name: `返回 ${target}（全员压力 +1）`, exact: true }).click();
  }
  await expect(page.getByTestId("dungeon-checkpoint")).toContainText("Trap 分配，保留代币");
  await page.getByRole("button", { name: "结算 Trap 房间", exact: true }).click();
  for (let hero = 0; hero < 4; hero++) {
    await page.getByRole("button", { name: `hero-${hero}：分配陷阱房 3 点`, exact: true }).click();
    await page.getByRole("button", { name: "3 伤口 + 0 压力", exact: true }).click();
  }
  await expect(page.getByTestId("dungeon-pressure")).toContainText("hero-1 压力 5 · 伤口 4/14");
  await expect(page.getByTestId("dungeon-pressure")).toContainText("hero-2 压力 3 · 伤口 6/12");
  await expect(page.getByTestId("dungeon-room-resolution")).toContainText("全员完成，保留代币");
  await expect(page.getByTestId("dungeon-provisions")).toContainText("tool-1");
  await page.screenshot({ path: testInfo.outputPath("dungeon-trap-room.png"), fullPage: true });
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
