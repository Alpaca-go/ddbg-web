import { expect, test } from "@playwright/test";

test("加载获批数据，多目标治疗共用一骰且选择不会跨区域残留", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto("/");
  await expect(page).toHaveTitle("暗黑地牢桌游");
  await expect(page.getByRole("heading", { name: "暗黑地牢桌游" })).toBeVisible();
  await expect(page.getByTestId("turn-status")).toHaveText("尚未开始");
  await expect(page.getByTestId("step-hint")).toContainText("准备战斗");
  await expect(page.getByTestId("area-A")).toContainText("4/4 格");
  await expect(page.getByTestId("area-B")).toContainText("Bone Soldier");
  await expect(page.getByTestId("entity-hero-0")).toContainText("伤口 0/17");
  await expect(page.getByTestId("area-F")).toContainText("连接：无");
  await page.screenshot({ path: testInfo.outputPath("battle-sandbox.png"), fullPage: true });
  // 同一冒烟覆盖新增状态卡：Self 自动选自身，Nt 真正进入状态，无 Acc 不掷骰。
  await page.getByLabel("种子", { exact: true }).fill("5");
  await page.getByRole("button", { name: "重新布置", exact: true }).click();
  await page.getByRole("button", { name: "开始战斗", exact: true }).click();
  await page.getByRole("button", { name: "抽取先攻", exact: true }).click();
  await expect(page.getByLabel("技能", { exact: true }).getByRole("option")).toHaveCount(21);
  await expect(
    page
      .getByLabel("技能", { exact: true })
      .getByRole("option", { name: "Bulwark of Faith III", exact: true }),
  ).toHaveCount(1);
  await page.getByLabel("技能", { exact: true }).selectOption("hero_skill:p012");
  await expect(page.getByTestId("skill-requirements")).toContainText("卡面目标：自身");
  await expect(page.getByTestId("skill-requirements")).not.toContainText("卡面射程");
  await expect(page.getByText("目标：自身 · CRUSADER", { exact: true })).toBeVisible();
  await expect(page.getByLabel("目标", { exact: true })).toHaveCount(0);
  const selfCard = page.getByTestId("skill-card-text");
  await expect(selfCard).toContainText("Bulwark of Faith · 等级 3");
  await expect(selfCard).toContainText("[防护] 3t, [标记] 2t, [光照（火把）] +2");
  await expect(selfCard).not.toContainText("self_effects");
  await page.getByRole("button", { name: "使用技能", exact: true }).click();
  await expect(page.getByTestId("entity-hero-0")).toContainText("防护 / 3t；标记 / 2t");
  await expect(page.getByTestId("rng-status")).toContainText("RNG 游标 4");
  await expect(page.getByTestId("turn-status")).toContainText("剩余 1 行动");
  await page.screenshot({ path: testInfo.outputPath("status-self-result.png"), fullPage: true });
  await page.getByLabel("测试布置", { exact: true }).selectOption("heal");
  await page.getByRole("button", { name: "重新布置", exact: true }).click();
  await page.getByRole("button", { name: "开始战斗", exact: true }).click();
  await page.getByRole("button", { name: "抽取先攻", exact: true }).click();
  await page.getByLabel("技能", { exact: true }).selectOption("hero_skill:p019");
  await expect(page.getByTestId("skill-card-text")).toContainText("Inspiring Cry · 等级 1");
  await page.getByLabel("目标", { exact: true }).selectOption("hero-1");
  await page.getByRole("button", { name: "使用技能", exact: true }).click();
  await expect(page.getByTestId("entity-hero-1")).toContainText("伤口 4/");
  await expect(page.getByTestId("entity-hero-0")).toContainText("伤口 5/");
  await expect(page.getByTestId("rng-status")).toContainText("RNG 游标 4");
  await expect(page.getByTestId("turn-status")).toContainText("剩余 1 行动");
  await page.screenshot({ path: testInfo.outputPath("inspiring-cry-result.png"), fullPage: true });
  await page.getByLabel("测试布置", { exact: true }).selectOption("formalBack");
  await page.getByRole("button", { name: "重新布置", exact: true }).click();
  await expect(page.getByTestId("area-C")).toContainText("2/3 格");
  await expect(page.getByTestId("area-H")).toContainText("2/2 格");
  await expect(page.getByTestId("entity-monster-0")).toContainText("区域 D");
  await expect(page.getByTestId("entity-monster-2")).toContainText("区域 F");
  await expect(page.getByTestId("area-F")).toContainText("连接：无");
  await expect(page.getByTestId("area-C")).toContainText("Cornered");
  await page.screenshot({ path: testInfo.outputPath("formal-deployment.png"), fullPage: true });
  await page.getByRole("button", { name: "开始战斗", exact: true }).click();
  while (await page.getByRole("group", { name: /待选决策/ }).count()) {
    await expect(page.getByTestId("pending-status")).toContainText("等待开局补给选择");
    await expect(page.getByTestId("pending-status")).not.toContainText("位移");
    await expect(page.getByTestId("step-hint")).toContainText("Wild 补给");
    await page
      .getByRole("group", { name: /待选决策/ })
      .getByRole("button", { name: "火把", exact: true })
      .click();
  }
  await expect(page.getByTestId("area-C")).toContainText("宝箱");
  await expect(page.getByTestId("area-H")).toContainText("宝箱");
  await expect(page.getByTestId("step-hint")).toContainText("等待先攻");
  await expect(page.getByTestId("pending-status")).toHaveCount(0);
  const provisionOptions = page.getByLabel("补给", { exact: true }).getByRole("option");
  const usableProvision = provisionOptions.filter({ hasText: /食物|绷带|药水|火把/ }).first();
  await page
    .getByLabel("补给", { exact: true })
    .selectOption((await usableProvision.getAttribute("value"))!);
  await page.getByRole("button", { name: "免费使用补给", exact: true }).click();
  await expect(page.getByRole("group", { name: "免费补给 · 7/16", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "战斗日志" })).toContainText("CRUSADER · 消耗：");
  await expect(page.getByRole("region", { name: "战斗日志" })).toContainText("所选效果：");
  await expect(page.getByRole("region", { name: "战斗日志" })).toContainText(
    "HELLION · 补给骰面：火把",
  );
  await page.screenshot({ path: testInfo.outputPath("supply-history.png"), fullPage: true });
  await expect(page.getByTestId("rng-status")).toContainText("RNG 游标 24");
  await page.getByRole("button", { name: "抽取先攻", exact: true }).click();
  await expect(page.getByRole("group", { name: /待选决策/ })).toContainText("回合开始前");
  await expect(page.getByTestId("pending-status")).toContainText("回合开始前补给窗口");
  await expect(page.getByTestId("pending-status")).toContainText("可免费使用补给");
  await expect(page.getByTestId("step-hint")).toContainText("结算回合开始效果");
  await expect(page.getByRole("button", { name: "免费使用补给", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "结算回合开始效果", exact: true }).click();
  await expect(page.getByRole("group", { name: /待选决策/ })).toHaveCount(0);
  await page.getByLabel("测试布置", { exact: true }).selectOption("heal");
  await page.getByLabel("种子", { exact: true }).fill("5");
  async function heal() {
    await page.getByRole("button", { name: "重新布置", exact: true }).click();
    await page.getByRole("button", { name: "开始战斗", exact: true }).click();
    await page.getByRole("button", { name: "抽取先攻", exact: true }).click();
    // 由前排 Crusader 完成两次真实移动，再抽到防御位 Vestal，不绕过回合。
    for (const area of ["A", "B"]) {
      await page.getByRole("button", { name: `前往 ${area}`, exact: true }).click();
      await page.getByRole("button", { name: "确认移动", exact: true }).click();
    }
    await page.getByRole("button", { name: "抽取先攻", exact: true }).click();
    await expect(page.getByTestId("turn-status")).toContainText("VESTAL · 剩余 2 行动");
    await page.getByLabel("技能", { exact: true }).selectOption("hero_skill:p097");
    await expect(page.getByTestId("skill-requirements")).toContainText("卡面射程：区域距离 1");
    await expect(page.getByTestId("skill-requirements")).toContainText(
      "卡面目标：同一区域内最多 3 个目标",
    );
    await expect(page.getByRole("button", { name: "使用技能", exact: true })).toBeDisabled();
    await page.getByLabel("目标区域", { exact: true }).selectOption("F");
    await expect(page.getByRole("group", { name: "同区目标", exact: true })).toContainText(
      "此区域没有存活目标",
    );
    await page.getByLabel("目标区域", { exact: true }).selectOption("B");
    await page.getByRole("checkbox", { name: "选择 HELLION", exact: true }).check();
    await page.getByLabel("目标区域", { exact: true }).selectOption("C");
    await expect(page.getByRole("button", { name: "使用技能", exact: true })).toBeDisabled();
    await page.getByRole("checkbox", { name: "选择 Bone Soldier", exact: true }).check();
    await page.getByRole("button", { name: "使用技能", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("目标");
    await expect(page.getByTestId("turn-status")).toContainText("剩余 2 行动");
    await expect(page.getByTestId("rng-status")).toContainText("RNG 游标 4");
    await page.getByLabel("目标区域", { exact: true }).selectOption("B");
    await expect(
      page.getByRole("checkbox", { name: "选择 HELLION", exact: true }),
    ).not.toBeChecked();
    await page.getByRole("checkbox", { name: "选择 HELLION", exact: true }).check();
    await page.getByLabel("技能", { exact: true }).selectOption("hero_skill:p088");
    await page.getByLabel("技能", { exact: true }).selectOption("hero_skill:p097");
    await expect(
      page.getByRole("checkbox", { name: "选择 HELLION", exact: true }),
    ).not.toBeChecked();
    for (const hero of ["CRUSADER", "HELLION", "HIGHWAYMAN"]) {
      await page.getByRole("checkbox", { name: `选择 ${hero}`, exact: true }).check();
    }
    await page.screenshot({
      path: testInfo.outputPath("multi-target-selection.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "使用技能", exact: true }).click();
    await expect(page.getByTestId("entity-hero-3")).toContainText("伤口 3/12");
    for (const [id, life] of [
      [0, 17],
      [1, 14],
      [2, 12],
    ]) {
      await expect(page.getByTestId(`entity-hero-${id}`)).toContainText(`伤口 2/${life}`);
    }
    await expect(page.getByTestId("turn-status")).toContainText("剩余 1 行动");
    await expect(page.getByTestId("rng-status")).toContainText("RNG 游标 5");
    const log = page.getByRole("region", { name: "战斗日志" });
    await expect(log).toContainText("CRUSADER：暴击");
    await expect(log).toContainText("HELLION：暴击");
    await expect(log).toContainText("HIGHWAYMAN：暴击");
    await expect(log).toContainText("使用者：VESTAL");
    await expect(log).toContainText("CRUSADER · 区域路径：B → A");
    await expect(log).toContainText("CRUSADER · 结算后伤口 2/17");
    await expect(log).toContainText("VESTAL · 结算后伤口 3/12");
    await expect(log).toContainText("技能：Divine Comfort · CRUSADER：暴击 · 印刷治疗值 3");
    await expect(log.getByText(/· 未结算效果$/, { exact: false })).toHaveCount(3);
    await log.getByText("CRUSADER · 未结算效果", { exact: true }).click();
    await expect(log.getByText("组合标记没有额外结算。", { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("multi-target-result.png"), fullPage: true });
    // 成功使用后再次尝试不会扣行动或多掷骰。
    await page.getByRole("button", { name: "使用技能", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("本回合已成功使用");
    await expect(page.getByTestId("turn-status")).toContainText("剩余 1 行动");
    expect((await log.innerText()).match(/d10=/g)).toHaveLength(1);
    return log.innerText();
  }
  const first = await heal();
  expect(await heal()).toBe(first);
  // 逐卡复核的 Battle Heal I：Crusader 在 B，治疗 A 的 Vestal（距离 1）。
  async function battleHeal() {
    await page.getByRole("button", { name: "重新布置", exact: true }).click();
    await page.getByRole("button", { name: "开始战斗", exact: true }).click();
    await page.getByRole("button", { name: "抽取先攻", exact: true }).click();
    await page.getByLabel("技能", { exact: true }).selectOption("hero_skill:p013");
    await page.getByLabel("目标", { exact: true }).selectOption("hero-3");
    await expect(page.getByTestId("skill-card-text")).toContainText("Battle Heal · 等级 1");
    await expect(page.getByTestId("skill-card-text")).toContainText("[射程] 0-1");
    await page.screenshot({ path: testInfo.outputPath("battle-heal-card.png"), fullPage: true });
    await page.getByRole("button", { name: "使用技能", exact: true }).click();
    await expect(page.getByTestId("entity-hero-3")).toContainText("伤口 1/12");
    await expect(page.getByTestId("entity-hero-0")).toContainText("伤口 5/17");
    await expect(page.getByTestId("turn-status")).toContainText("CRUSADER · 剩余 1 行动");
    await expect(page.getByTestId("rng-status")).toContainText("RNG 游标 5");
    const log = page.getByRole("region", { name: "战斗日志" });
    await expect(log).toContainText("Battle Heal · VESTAL：暴击 · 印刷治疗值 4");
    await page.screenshot({ path: testInfo.outputPath("battle-heal-result.png"), fullPage: true });
    await page.getByRole("button", { name: "使用技能", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("本回合已成功使用");
    await expect(page.getByTestId("rng-status")).toContainText("RNG 游标 5");
    await expect(page.getByTestId("turn-status")).toContainText("剩余 1 行动");
    expect((await log.innerText()).match(/d10=/g)).toHaveLength(1);
    return log.innerText();
  }
  expect(await battleHeal()).toBe(await battleHeal());
  // Holy Lance I：先走完两名英雄的真实回合，再由远程 Crusader 攻击 Unholy。
  await page.getByLabel("测试布置", { exact: true }).selectOption("shuffle");
  async function holyLance() {
    await page.getByRole("button", { name: "重新布置", exact: true }).click();
    await page.getByRole("button", { name: "开始战斗", exact: true }).click();
    for (let turn = 0; turn < 2; turn++) {
      await page.getByRole("button", { name: "抽取先攻", exact: true }).click();
      for (const area of turn === 0 ? ["B", "A"] : ["B", "C"]) {
        await page.getByRole("button", { name: `前往 ${area}`, exact: true }).click();
        await page.getByRole("button", { name: "确认移动", exact: true }).click();
      }
    }
    await page.getByRole("button", { name: "抽取先攻", exact: true }).click();
    await expect(page.getByTestId("turn-status")).toContainText("CRUSADER · 剩余 2 行动");
    await page.getByLabel("技能", { exact: true }).selectOption("hero_skill:p016");
    await page.getByLabel("目标", { exact: true }).selectOption("soldier");
    await expect(page.getByTestId("skill-card-text")).toContainText("Holy Lance · 等级 1");
    await expect(page.getByTestId("skill-card-text")).toContainText("+1 vs Unholy");
    await page.screenshot({ path: testInfo.outputPath("holy-lance-card.png"), fullPage: true });
    await page.getByRole("button", { name: "使用技能", exact: true }).click();
    await expect(page.getByTestId("turn-status")).toContainText("剩余 2 行动");
    await expect(page.getByTestId("rng-status")).toContainText("RNG 游标 5");
    await expect(page.getByRole("button", { name: "使用技能", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "结算位移", exact: true }).click();
    await expect(page.getByTestId("entity-hero-0")).toContainText("区域 A");
    await expect(page.getByTestId("turn-status")).toHaveText("胜利");
    const log = page.getByRole("region", { name: "战斗日志" });
    await expect(log).toContainText("Holy Lance · Bone Soldier：暴击 · 伤害 14");
    await expect(log).toContainText("CRUSADER · 区域落点：A · 姿态位移 1 格");
    expect((await log.innerText()).match(/d10=/g)).toHaveLength(1);
    await page.screenshot({ path: testInfo.outputPath("holy-lance-result.png"), fullPage: true });
    return log.innerText();
  }
  expect(await holyLance()).toBe(await holyLance());
  await page.getByLabel("测试布置", { exact: true }).selectOption("heal");
  async function emptyArea() {
    await page.getByRole("button", { name: "重新布置", exact: true }).click();
    await page.getByRole("button", { name: "开始战斗", exact: true }).click();
    await page.getByRole("button", { name: "抽取先攻", exact: true }).click();
    for (const area of ["A", "B"]) {
      await page.getByRole("button", { name: `前往 ${area}`, exact: true }).click();
      await page.getByRole("button", { name: "确认移动", exact: true }).click();
    }
    await page.getByRole("button", { name: "抽取先攻", exact: true }).click();
    await page.getByLabel("技能", { exact: true }).selectOption("hero_skill:p097");
    await page.getByRole("checkbox", { name: "选择空区域", exact: true }).check();
    await page.getByLabel("空区域", { exact: true }).selectOption("F");
    await page.getByRole("button", { name: "使用技能", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("连通");
    await expect(page.getByTestId("rng-status")).toContainText("RNG 游标 4");
    await page.getByLabel("空区域", { exact: true }).selectOption("E");
    await page.getByRole("button", { name: "使用技能", exact: true }).click();
    await expect(page.getByTestId("entity-hero-3")).toContainText("伤口 3/12");
    await expect(page.getByTestId("entity-hero-1")).toContainText("伤口 5/14");
    await expect(page.getByTestId("turn-status")).toContainText("剩余 1 行动");
    await expect(page.getByTestId("rng-status")).toContainText("RNG 游标 5");
    const log = page.getByRole("region", { name: "战斗日志" });
    await expect(log).toContainText("VESTAL · Divine Comfort → 空区域 E · 无目标命中 / 暴击判定");
    await page.getByRole("button", { name: "使用技能", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("成功使用");
    await expect(page.getByTestId("rng-status")).toContainText("RNG 游标 5");
    return log.innerText();
  }
  const emptyFirst = await emptyArea();
  await page.screenshot({ path: testInfo.outputPath("empty-area-result.png"), fullPage: true });
  expect(await emptyArea()).toBe(emptyFirst);
  // 完整印刷 p088：Judgement I 的射程 1–2；Vestal 从防御后移到远程后攻击 C。
  await page.getByRole("button", { name: "重新布置", exact: true }).click();
  await page.getByRole("button", { name: "开始战斗", exact: true }).click();
  await page.getByRole("button", { name: "抽取先攻", exact: true }).click();
  for (const area of ["A", "B"]) {
    await page.getByRole("button", { name: `前往 ${area}`, exact: true }).click();
    await page.getByRole("button", { name: "确认移动", exact: true }).click();
  }
  await page.getByRole("button", { name: "抽取先攻", exact: true }).click();
  await page.getByRole("button", { name: "向后换姿态", exact: true }).click();
  await page.getByLabel("技能", { exact: true }).selectOption("hero_skill:p088");
  await page.getByLabel("目标", { exact: true }).selectOption("soldier");
  await page.getByRole("button", { name: "使用技能", exact: true }).click();
  await expect(page.getByTestId("entity-hero-3")).toContainText("伤口 3/12");
  await expect(page.getByTestId("turn-status")).toHaveText("胜利");
  await expect(page.getByTestId("rng-status")).toContainText("RNG 游标 5");
  await expect(page.getByRole("region", { name: "战斗日志" })).toContainText("Judgement");
  await expect(page.getByRole("region", { name: "战斗日志" })).not.toContainText("拒绝");
  await page.screenshot({
    path: testInfo.outputPath("judgement-range-result.png"),
    fullPage: true,
  });
  // R14：正式探索入口免费换位，存档刷新后保留；已选路线前后冻结窗口一致。
  await page.goto("/?phase=3&play=1");
  await page.getByLabel("任务模式").selectOption("radiant");
  await page.getByLabel("任务种子").fill("31");
  await page.getByRole("button", { name: "进入地牢", exact: true }).click();
  const forward = page.getByRole("button", { name: "VESTAL 前移", exact: true });
  await expect(forward).toBeDisabled();
  await page.getByRole("button", { name: "掷开局补给骰", exact: true }).click();
  while (await page.getByRole("button", { name: "火把", exact: true }).count())
    await page.getByRole("button", { name: "火把", exact: true }).click();
  for (let i = 0; i < 3; i++) await forward.click();
  await expect(page.getByTestId("dungeon-stance-aggressive")).toContainText("hero-3");
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByTestId("dungeon-stance-aggressive")).toContainText("hero-3");
  const moveOther = page.getByRole("button", { name: "CRUSADER 前移", exact: true });
  await expect(moveOther).toBeEnabled();
  await page.getByRole("button", { name: "选择下一段探索", exact: true }).click();
  await expect(moveOther).toBeDisabled();
  // R32：从已保存的空闲探索回村，免费换位及正式存档在村庄同样可用。
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await page.getByRole("button", { name: "离开地牢", exact: true }).click();
  await page.getByRole("button", { name: "全员同意离开", exact: true }).click();
  await page.getByRole("button", { name: "生成任务结算摘要", exact: true }).click();
  await page.getByRole("button", { name: "返回村庄", exact: true }).click();
  await page.getByRole("button", { name: "兑换剩余补给并完成回村", exact: true }).click();
  await expect(moveOther).toBeEnabled();
  await moveOther.click();
  await expect(page.getByTestId("hamlet-stance-aggressive")).toContainText("hero-0");
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByTestId("hamlet-stance-aggressive")).toContainText("hero-0");
});

test("英雄射程拒绝后移动攻击，胜利停场且同种子回放一致", async ({ page }, testInfo) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto("/");
  async function win() {
    await page.getByRole("button", { name: "开始战斗", exact: true }).click();
    await page.getByRole("button", { name: "抽取先攻", exact: true }).click();
    // 种子 1 的首张为怪物，完成它的回合再抽到 Crusader。
    await page.getByRole("button", { name: "怪物选招与选目标", exact: true }).click();
    const monsterCard = page.getByTestId("skill-card-text");
    await expect(monsterCard).toBeVisible();
    await expect(monsterCard).toContainText("Crit");
    await expect(monsterCard).toContainText("Acc");
    await expect(monsterCard).toContainText("[伤害（图标内数字为伤害值）]");
    const selectionLog = page.getByRole("region", { name: "战斗日志" });
    await expect(selectionLog).toContainText("第 1 轮开始");
    await expect(selectionLog).toContainText("第 1 轮 · 先攻：怪物 · 回合：Bone Soldier");
    await expect(selectionLog).toContainText(
      "Bone Soldier · 技能 1：Graveyard Slash · 固定技能（不掷选招骰）",
    );
    await expect(selectionLog).toContainText(/卡面目标优先级：.+ · 最终目标：CRUSADER/);
    await page.screenshot({ path: testInfo.outputPath("monster-skill-card.png"), fullPage: true });
    await page.getByRole("button", { name: "怪物移动到射程", exact: true }).click();
    await page.getByRole("button", { name: "结算怪物技能", exact: true }).click();
    await page.getByRole("button", { name: "抽取先攻", exact: true }).click();
    await expect(page.getByTestId("turn-status")).toContainText("CRUSADER · 剩余 2 行动");
    await expect(selectionLog).toContainText("第 1 轮 · 回合结束：Bone Soldier");
    await expect(selectionLog).toContainText("第 1 轮 · 先攻：英雄 · 回合：CRUSADER");
    await page.getByRole("button", { name: "使用技能", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("射程");
    await expect(page.getByTestId("turn-status")).toContainText("剩余 2 行动");
    await page.getByRole("button", { name: "前往 B", exact: true }).click();
    await page.getByRole("button", { name: "确认移动", exact: true }).click();
    await expect(page.getByTestId("entity-hero-0")).toContainText("区域 B");
    await expect(page.getByTestId("turn-status")).toContainText("剩余 1 行动");
    await page.getByRole("button", { name: "使用技能", exact: true }).click();
    await expect(page.getByTestId("turn-status")).toHaveText("胜利");
    await expect(selectionLog).toContainText("第 1 轮 · 退出战场：Bone Soldier");
    await expect(selectionLog).toContainText("第 1 轮 · 单场结束：胜利");
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
  await expect(page.getByRole("region", { name: "战斗日志" })).toContainText(
    "Bone Soldier · 技能 1：Graveyard Slash · 固定技能（不掷选招骰）",
  );
  await expect(page.getByRole("region", { name: "战斗日志" })).toContainText(
    "卡面目标优先级：Most Wounded · 最终目标：CRUSADER",
  );
  await page.getByRole("button", { name: "怪物移动到射程", exact: true }).click();
  await expect(page.getByTestId("area-B")).toContainText("Bone Soldier");
  await page.getByRole("button", { name: "结算怪物技能", exact: true }).click();
  await expect(page.getByTestId("turn-status")).toHaveText("等待抽取先攻");
  await expect(page.getByTestId("entity-hero-0")).toContainText("伤口 5/17");
  await expect(page.getByRole("region", { name: "战斗日志" })).toContainText(
    "Bone Soldier · 定位：B → B · 移动 0 步",
  );
  await expect(page.getByRole("region", { name: "战斗日志" })).toContainText(
    "技能：Graveyard Slash · CRUSADER：命中 · 伤害 5",
  );
  // 同一条单场流程冒烟覆盖另外两种已核实怪物组合，真实按钮走完四轮撤退。
  for (const layout of ["pair", "trio", "formalSoldier", "formalMixed", "formalBack"]) {
    const formal = layout.startsWith("formal");
    await page.getByLabel("测试布置", { exact: true }).selectOption(layout);
    await page.getByRole("button", { name: "重新布置", exact: true }).click();
    if (!formal) await expect(page.getByTestId("area-B")).toContainText("Bone Rabble");
    if (layout === "trio")
      await expect(page.getByTestId("entity-courtier")).toContainText("Dodge 1");
    await page.getByRole("button", { name: "开始战斗", exact: true }).click();
    let breakthroughUsed = false;
    let lootUsed = false;
    const heroSkillsUsed = new Set<string>();
    let vestalMoved = false;
    for (let step = 0; step < 240; step += 1) {
      const turn = await page.getByTestId("turn-status").innerText();
      if (turn.includes("撤退")) break;
      const choice = page.getByRole("group", { name: /待选决策/ });
      if (await choice.count()) {
        if (/选择战利品奖励|选择补给骰面/.test(await choice.innerText())) {
          await expect(page.getByTestId("pending-status")).toContainText("等待宝箱奖励选择");
          await expect(page.getByTestId("pending-status")).not.toContainText("位移");
          await expect(page.getByTestId("step-hint")).toContainText("宝箱奖励");
        }
        await choice.getByRole("button").first().click();
      } else if (await page.getByRole("button", { name: "结算位移", exact: true }).count())
        await page.getByRole("button", { name: "结算位移", exact: true }).click();
      else if (turn.includes("等待抽取先攻"))
        await page.getByRole("button", { name: "抽取先攻", exact: true }).click();
      else if (turn.includes("怪物回合")) {
        for (const name of ["怪物选招与选目标", "怪物移动到射程", "结算怪物技能"]) {
          const button = page.getByRole("button", { name, exact: true });
          if (await button.count()) {
            await expect(page.getByTestId("step-hint")).toContainText(name);
            await button.click();
            break;
          }
        }
      } else {
        const chest = page.getByRole("button", { name: "拾取同区宝箱", exact: true });
        if (formal && !lootUsed && (await chest.isEnabled())) {
          await chest.click();
          lootUsed = true;
          continue;
        }
        const stance = await page
          .locator(".monster-stance-column")
          .filter({ hasText: "← 当前" })
          .locator(".stance-label")
          .innerText();
        if (formal) {
          const hero = turn.split(" · ")[0]!;
          if (!heroSkillsUsed.has(hero)) {
            if (hero === "CRUSADER" && ["进攻", "防御"].includes(stance)) {
              await page.getByLabel("技能", { exact: true }).selectOption("hero_skill:p010");
            } else if (hero === "HELLION") {
              await page.getByLabel("技能", { exact: true }).selectOption("hero_skill:p037");
            } else if (hero === "HIGHWAYMAN") {
              await page.getByLabel("技能", { exact: true }).selectOption("hero_skill:p076");
              await expect(page.getByTestId("skill-requirements")).toContainText(
                "卡面射程：区域距离 1–2",
              );
              // 首次仍在正式出生 H；J / I / D / E 都在已核实的 1–2 射程内，F 断开。
              const target = page
                .getByLabel("目标", { exact: true })
                .getByRole("option")
                .filter({ hasText: /Bone .* · (J|I|D|E)$/ })
                .first();
              if (!(await target.count())) throw new Error(`${layout} 缺 Highwayman 可达目标`);
              await page
                .getByLabel("目标", { exact: true })
                .selectOption((await target.getAttribute("value"))!);
            } else if (hero === "VESTAL" && ["支援", "远程", "防御"].includes(stance)) {
              if (!vestalMoved) {
                // C→E 一步；随后 Divine Comfort 射程 1 治疗留在 C 的 Hellion。
                await page.getByRole("button", { name: "前往 E", exact: true }).click();
                await page.getByRole("button", { name: "确认移动", exact: true }).click();
                vestalMoved = true;
                continue;
              }
              await page.getByLabel("技能", { exact: true }).selectOption("hero_skill:p097");
              await page.getByLabel("目标区域", { exact: true }).selectOption("C");
              await page.getByRole("checkbox", { name: "选择 HELLION", exact: true }).check();
            } else throw new Error(`${layout} ${hero} 首次技能姿态异常`);
            await page.getByRole("button", { name: "使用技能", exact: true }).click();
            await expect(page.getByRole("region", { name: "战斗日志" })).not.toContainText("拒绝");
            if (turn.includes("剩余 2 行动"))
              await expect(page.getByTestId("turn-status")).toContainText("剩余 1 行动");
            else await expect(page.getByTestId("turn-status")).toHaveText("等待抽取先攻");
            if (hero === "CRUSADER")
              await expect(page.getByTestId("entity-hero-0")).toContainText("防护 / 2t；标记 / 3t");
            if (hero === "HELLION")
              await expect(page.getByTestId("entity-hero-1")).toContainText("增益 / 3t");
            if (hero === "HIGHWAYMAN")
              await expect(page.getByTestId("entity-hero-2")).toContainText("增益 / 3t");
            heroSkillsUsed.add(hero);
            continue;
          }
        }
        if (
          !formal &&
          !breakthroughUsed &&
          turn.startsWith("HELLION") &&
          ["远程", "支援"].includes(stance)
        ) {
          await page.getByLabel("技能", { exact: true }).selectOption("hero_skill:p034");
          await page.getByLabel("目标区域", { exact: true }).selectOption("B");
          for (const checkbox of await page
            .getByRole("group", { name: "同区目标", exact: true })
            .getByRole("checkbox")
            .all())
            await checkbox.check();
          await page.getByRole("button", { name: "使用技能", exact: true }).click();
          await expect(page.getByRole("region", { name: "战斗日志" })).toContainText(
            "全部目标效果尚未提交",
          );
          breakthroughUsed = true;
          continue;
        }
        await page
          .getByRole("button", {
            name: stance === "进攻" ? "向后换姿态" : "向前换姿态",
            exact: true,
          })
          .click();
      }
    }
    await expect(page.getByTestId("turn-status")).toHaveText("第 4 轮结束：撤退");
    await expect(page.getByTestId("step-hint")).toContainText("单场结束");
    if (formal) {
      const log = page.getByRole("region", { name: "战斗日志" });
      // 后来的轮次不能覆盖第一轮历史；正式补给窗口也不冒充已完成回合开始效果。
      await expect(log).toContainText("第 1 轮开始");
      await expect(log).toContainText("第 4 轮开始");
      await expect(log).toContainText("第 4 轮 · 单场结束：撤退");
      await expect(log).toContainText("第 1 轮 · 换姿态：");
      await expect(log).toContainText(/第 1 轮 · 先攻：怪物 · 回合：Bone /);
      await expect(log).toContainText("固定技能（不掷选招骰）");
      if (layout === "formalSoldier") {
        await expect(log).toContainText(
          "卡面目标优先级：Furthest · 没有有限距离目标，本回合跳过攻击",
        );
      }
      expect(lootUsed).toBe(true);
      await expect(page.getByRole("region", { name: "战斗日志" })).toContainText(
        /获得金币 \d+|获得补给：/,
      );
      await expect(page.getByRole("region", { name: "战斗日志" })).toContainText(
        "CRUSADER · 同时伤口 0",
      );
      expect([...heroSkillsUsed].sort()).toEqual(["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"]);
      expect(vestalMoved).toBe(true);
      await expect(page.getByTestId("area-C")).not.toContainText("宝箱");
      await expect(page.getByTestId("area-H")).not.toContainText("宝箱");
      await page.screenshot({
        path: testInfo.outputPath(`${layout}-four-rounds.png`),
        fullPage: false,
      });
    } else expect(breakthroughUsed).toBe(true);
    await expect(page.getByRole("region", { name: "战斗日志" })).not.toContainText("拒绝");
  }
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
    await expect(page.getByTestId("pending-status")).toContainText("等待位移区域选择");
    await expect(page.getByTestId("step-hint")).toContainText("不重新掷骰");
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
    await expect(page.getByTestId("pending-status")).toHaveCount(0);
    await expect(page.getByTestId("step-hint")).toContainText("单场结束");
    await expect(page.getByTestId("rng-status")).toContainText("RNG 游标 5 · 命令 5");
    const log = await page.getByRole("region", { name: "战斗日志" }).innerText();
    expect(log).toContain(`HIGHWAYMAN · 区域落点：${area} · 姿态位移 1 格`);
    expect(log.match(/d10=/g)).toHaveLength(1);
    expect(log.match(/怪物全灭，战斗胜利/g)).toHaveLength(1);
    return log;
  }
  // 种子 5 为暴击、种子 4 为普通命中；均杀死末只怪物，但先完成自身位移。
  const first = await choose("5", "E");
  expect(await choose("5", "E")).toBe(first);
  await choose("4", "B");
  // R21：真实 Duelist's Advance 以空区域 E 为参照，只执行自身效果。
  await page.getByLabel("种子", { exact: true }).fill("5");
  await page.getByRole("button", { name: "重新布置", exact: true }).click();
  await page.getByRole("button", { name: "开始战斗", exact: true }).click();
  await page.getByRole("button", { name: "抽取先攻", exact: true }).click();
  await page.getByRole("button", { name: "向后换姿态", exact: true }).click();
  await page.getByLabel("技能", { exact: true }).selectOption("hero_skill:p079");
  await page.getByRole("checkbox", { name: "选择空区域", exact: true }).check();
  await page.getByLabel("空区域", { exact: true }).selectOption("E");
  await page.getByRole("button", { name: "使用技能", exact: true }).click();
  await expect(page.getByTestId("turn-status")).toContainText("剩余 1 行动");
  await expect(page.getByTestId("entity-hero-2")).toContainText("反击 / 2t");
  await expect(page.getByRole("button", { name: "使用技能", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "结算位移", exact: true }).click();
  await expect(page.getByTestId("entity-hero-2")).toContainText("区域 E");
  await expect(
    page
      .locator(".monster-stance-column")
      .filter({ has: page.getByTestId("entity-hero-2") })
      .locator(".stance-label"),
  ).toHaveText("进攻");
  await expect(page.getByTestId("turn-status")).toHaveText("等待抽取先攻");
  await expect(page.getByTestId("rng-status")).toContainText("RNG 游标 5");
  await expect(page.getByRole("region", { name: "战斗日志" })).not.toContainText("拒绝");
  await page.screenshot({ path: testInfo.outputPath("empty-area-self-pull.png"), fullPage: true });
});
