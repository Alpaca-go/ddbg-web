import { expect, test } from "@playwright/test";

test("Phase 3：侦察同意、隐蔽信息、Radiant 减骰与结算停点", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
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
  for (const fixture of ["roomApproved", "roomBlocked"]) {
    await page.getByLabel("侦察测试布置").selectOption(fixture);
    await page.getByRole("button", { name: "重置 Radiant" }).click();
    await page.getByRole("button", { name: "侦察", exact: true }).click();
    await page.getByRole("button", { name: "全员同意", exact: true }).click();
    await page.getByRole("button", { name: "选择下一段探索" }).click();
    await page.getByRole("button", { name: "D", exact: true }).click();
    await page.getByRole("button", { name: "掷探索骰并开始结算" }).click();
    await expect(page.getByTestId("dungeon-node-D")).toContainText("巢穴");
    await page.getByRole("button", { name: "抽房间牌并匹配战斗板块" }).click();
    const card = page.getByTestId("dungeon-room-card");
    await expect(card).toContainText("完整遗迹房间牌池 9 张 · 余牌 8 · 已抽 1 张");
    await expect(card).toContainText(
      fixture === "roomApproved"
        ? "已匹配 Ritual Chamber"
        : "Tomb of Ancestor 对应板块几何 / 部署尚未获批",
    );
    await expect(page.getByRole("button", { name: "抽房间牌并匹配战斗板块" })).toHaveCount(0);
    const drawMonsters = page.getByRole("button", { name: "从完整 42 张怪物池抽牌并记录部署" });
    if (fixture === "roomApproved") {
      await drawMonsters.click();
      await expect(page.getByTestId("dungeon-monsters")).toContainText("完整牌池 42 张");
      await expect(page.getByTestId("dungeon-monsters")).toContainText("monster-deck:");
      await expect(card).toContainText("基础字段齐全");
    }
    await expect(drawMonsters).toHaveCount(0);
    await expect(page.getByRole("button", { name: "选择下一段探索" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "原路返回", exact: true })).toBeDisabled();
    await expect(page.getByTestId("dungeon-gold")).toHaveText("共享金币：0");
    await page.screenshot({ path: testInfo.outputPath(`${fixture}.png`), fullPage: true });
    if (fixture === "roomApproved") {
      await page.getByRole("button", { name: "进入房间战斗", exact: true }).click();
      await expect(page.getByTestId("turn-status")).toBeVisible();
      await expect(page.getByTestId("entity-monster-deck:p047")).toContainText("Pliskin");
      await expect(page.getByTestId("entity-monster-deck:p038")).toContainText("Spitter");
      await page.screenshot({
        path: testInfo.outputPath("roomApproved-battle.png"),
        fullPage: true,
      });
      await page.goto("/?phase=3");
    }
  }
  await page.getByLabel("侦察测试布置").selectOption("roomBattle");
  await page.getByRole("button", { name: "重置 Radiant" }).click();
  for (const name of [
    "侦察",
    "全员同意",
    "选择下一段探索",
    "D",
    "掷探索骰并开始结算",
    "抽房间牌并匹配战斗板块",
    "从完整 42 张怪物池抽牌并记录部署",
    "进入房间战斗",
    "开始战斗",
  ])
    await page.getByRole("button", { name, exact: true }).click();
  await expect(page.getByTestId("rng-status")).toContainText("seed 1885");
  await page.screenshot({ path: testInfo.outputPath("dungeon-battle.png"), fullPage: true });
  for (let i = 0; i < 220; i++) {
    if (await page.getByRole("button", { name: "返回地牢地图", exact: true }).count()) break;
    const choice = page.locator("fieldset.choice button").first();
    if (await choice.count()) {
      await choice.click();
      continue;
    }
    let clicked = false;
    for (const name of [
      "抽取先攻",
      "向前换姿态",
      "向后换姿态",
      "怪物选招与选目标",
      "怪物移动到射程",
      "结算怪物技能",
    ]) {
      const button = page.getByRole("button", { name, exact: true });
      if ((await button.count()) && (await button.isEnabled())) {
        await button.click();
        clicked = true;
        break;
      }
    }
    expect(clicked, (await page.getByRole("status").textContent()) ?? "没有可执行动作").toBe(true);
  }
  await expect(page.getByTestId("turn-status")).toContainText("第 4 轮结束：撤退");
  await page.getByRole("button", { name: "返回地牢地图", exact: true }).click();
  await expect(page.getByTestId("dungeon-events")).toContainText("第四轮撤退返回地图");
  await expect(page.getByTestId("dungeon-gold")).toHaveText("共享金币：0");
  await expect(page.getByTestId("dungeon-node-D")).not.toContainText("已清理");
  await expect(page.getByRole("button", { name: "选择下一段探索", exact: true })).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath("dungeon-retreat.png"), fullPage: true });
  // 同一条关键冒烟验证完整池自然抽到的 Maggot 感染；房间代币是显式测试布置。
  await page.goto("/?phase=3");
  await page.getByLabel("侦察测试布置").selectOption("roomDisease");
  for (const name of [
    "重置 Radiant",
    "侦察",
    "全员同意",
    "选择下一段探索",
    "D",
    "掷探索骰并开始结算",
    "抽房间牌并匹配战斗板块",
    "从完整 42 张怪物池抽牌并记录部署",
    "进入房间战斗",
    "开始战斗",
  ])
    await page.getByRole("button", { name, exact: true }).click();
  await expect(
    page.locator('[data-testid^="entity-monster-deck"]').filter({ hasText: "Maggot" }).first(),
  ).toBeVisible();
  const infected = page.locator('[data-testid^="conditions-hero-"]');
  for (let i = 0; i < 180 && !(await infected.count()); i++) {
    const choice = page.locator("fieldset.choice button").first();
    if (await choice.count()) {
      await choice.click();
      continue;
    }
    let clicked = false;
    for (const name of [
      "抽取先攻",
      "向前换姿态",
      "向后换姿态",
      "怪物选招与选目标",
      "怪物移动到射程",
      "结算怪物技能",
    ]) {
      const button = page.getByRole("button", { name, exact: true });
      if ((await button.count()) && (await button.isEnabled())) {
        await button.click();
        clicked = true;
        break;
      }
    }
    expect(clicked, "真实 Maggot 感染前遇到停点").toBe(true);
  }
  await expect(infected.first()).toContainText("疾病：");
  await expect(infected.first()).not.toContainText("疾病：无");
  await page.screenshot({ path: testInfo.outputPath("maggot-disease.png"), fullPage: true });
  await page.goto("/?phase=3");
  await page.getByLabel("侦察测试布置").selectOption("corridor");
  await page.getByRole("button", { name: "重置标准模式" }).click();
  await page.getByRole("button", { name: "选择下一段探索" }).click();
  await page.getByRole("button", { name: "D", exact: true }).click();
  await page.getByRole("button", { name: "掷探索骰并开始结算" }).click();
  await page.getByRole("button", { name: "hero-0:2 · Trap", exact: true }).click();
  await page.getByRole("button", { name: "陷阱攻击", exact: true }).click();
  await expect(page.getByTestId("dungeon-pressure")).toContainText("hero-0 压力 1 · 伤口 4/17");
  await expect(page.getByTestId("dungeon-pressure")).toContainText("hero-1 压力 0 · 伤口 0/14");
  await expect(page.getByTestId("dungeon-checkpoint")).toContainText("队伍尚未移动");
  await expect(page.getByText(/布置 RNG 游标 16/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "hero-0:1 · Stressful Darkness", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("dungeon-trap-attack.png"), fullPage: true });
  await page.getByRole("button", { name: "hero-0:1 · Stressful Darkness", exact: true }).click();
  await page.getByRole("button", { name: "光照 −1", exact: true }).click();
  await expect(page.getByText(/光照 4、DL 1/)).toBeVisible();
  await expect(page.getByTestId("dungeon-pressure")).toContainText("hero-0 压力 1 · 伤口 4/17");
  await expect(page.getByText(/布置 RNG 游标 16/)).toBeVisible();
  for (const name of [
    "hero-1:1 · 空白",
    "hero-1:2 · Rubble",
    "使用 tool（tool-1）抵消",
    "hero-2:1 · Trap",
    "使用 tool（tool-2）抵消",
    "hero-2:2 · 空白",
    "hero-3:1 · Hunger",
    "使用 food（food-1）抵消",
    "hero-3:2 · Trap",
    "使用 tool（tool-3）抵消",
  ])
    await page.getByRole("button", { name, exact: true }).click();
  await expect(page.getByTestId("dungeon-checkpoint")).toContainText("已到达 D；Empty 已清理");
  await expect(page.getByTestId("dungeon-provisions")).toContainText("torch-1");
  await page.getByRole("button", { name: "选择下一段探索" }).click();
  await page.getByRole("button", { name: "E", exact: true }).click();
  await page.getByRole("button", { name: "掷探索骰并开始结算" }).click();
  await expect(page.getByText(/光照 4、DL 1/)).toBeVisible();
  await expect(page.getByText(/布置 RNG 游标 24/)).toBeVisible();
  await expect(page.getByTestId("dungeon-checkpoint")).toContainText("队伍尚未移动");
  await page.screenshot({ path: testInfo.outputPath("dungeon-low-light.png"), fullPage: true });
  await page.getByLabel("侦察测试布置").selectOption("curioBuff");
  for (const name of [
    "重置标准模式",
    "选择下一段探索",
    "D",
    "掷探索骰并开始结算",
    "hero-0:1 · Curio",
    "使用 torch（torch-1），抽卡前抑制负面效果",
  ])
    await page.getByRole("button", { name, exact: true }).click();
  await expect(page.getByTestId("dungeon-curio")).toContainText("Eldritch Altar · p2");
  await expect(page.getByTestId("dungeon-curio")).toContainText("抽一张负面怪癖 · Torch 保护");
  await expect(page.getByTestId("dungeon-curio")).toContainText("增益，2 回合");
  await expect(page.getByTestId("dungeon-curio")).not.toContainText("增益，2 回合 · Torch 保护");
  await page.getByRole("button", { name: "结算当前 Curio" }).click();
  await expect(page.getByTestId("dungeon-curio")).toContainText("弃牌 1");
  await expect(page.getByTestId("dungeon-events")).toContainText("Buff 2t");
  await expect(page.getByTestId("dungeon-pressure")).toContainText("hero-0 压力 0 · 伤口 0/17");
  await expect(page.getByText(/布置 RNG 游标 38/)).toBeVisible();
  await page.getByLabel("侦察测试布置").selectOption("curioProvision");
  await page.getByRole("button", { name: "重置标准模式" }).click();
  for (const name of [
    "选择下一段探索",
    "D",
    "掷探索骰并开始结算",
    "hero-0:1 · Curio",
    "使用 torch（torch-1），抽卡前抑制负面效果",
    "结算当前 Curio",
  ])
    await page.getByRole("button", { name, exact: true }).click();
  await expect(page.getByTestId("dungeon-events")).toContainText("Wild");
  await expect(page.getByTestId("dungeon-gold")).toHaveText("共享金币：0");
  await expect(page.getByRole("button", { name: "结算当前 Curio" })).toBeDisabled();
  await page.getByRole("button", { name: "工具", exact: true }).click();
  await expect(page.getByTestId("dungeon-gold")).toHaveText("共享金币：10");
  await expect(page.getByTestId("dungeon-curio")).toContainText("弃牌 1");
  await expect(page.getByTestId("dungeon-provisions")).toContainText(
    "curio-provision:curio:p008:hero-0:1",
  );
  await page.screenshot({ path: testInfo.outputPath("curio-provision-wild.png"), fullPage: true });
  await expect(page.getByTestId("dungeon-pressure")).toContainText("hero-0 压力 0 · 伤口 0/17");
  await expect(page.getByText(/布置 RNG 游标 39/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("curio-approved-buff.png"), fullPage: true });
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
  await expect(page.getByTestId("dungeon-curio")).toContainText("Q-68");
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
  await page.getByLabel("侦察测试布置").selectOption("dark");
  for (const name of [
    "重置 Radiant",
    "侦察",
    "全员同意",
    "选择下一段探索",
    "D",
    "掷探索骰并开始结算",
    "结算 Dark 房间",
  ])
    await page.getByRole("button", { name, exact: true }).click();
  await expect(page.getByTestId("dungeon-checkpoint")).toContainText("Dark 已结算，保留代币");
  await expect(page.getByTestId("dungeon-node-D")).not.toContainText("已清理");
  await expect(page.getByText(/光照 4、DL 1/)).toBeVisible();
  await page.getByRole("button", { name: "使用 Torch（torch-1）：光照 +1", exact: true }).click();
  await expect(page.getByText(/光照 5、DL 1/)).toBeVisible();
  await expect(page.getByTestId("dungeon-provisions")).not.toContainText("torch-1");
  for (const to of ["G", "D"]) {
    await page.getByRole("button", { name: "原路返回", exact: true }).click();
    await page.getByRole("button", { name: `返回 ${to}（全员压力 +1）`, exact: true }).click();
  }
  await page.getByRole("button", { name: "结算 Dark 房间", exact: true }).click();
  await expect(page.getByText(/光照 4、DL 1/)).toBeVisible();
  await expect(page.getByTestId("dungeon-pressure")).toContainText("hero-0 压力 3");
  await page.screenshot({ path: testInfo.outputPath("dungeon-dark-room.png"), fullPage: true });
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
