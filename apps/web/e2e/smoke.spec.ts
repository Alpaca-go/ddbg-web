import { expect, test } from "@playwright/test";

test("加载获批数据，多目标治疗共用一骰且选择不会跨区域残留", async ({ page }, testInfo) => {
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
  // 同一冒烟覆盖新增状态卡：Self 自动选自身，Nt 真正进入状态，无 Acc 不掷骰。
  await page.getByLabel("种子", { exact: true }).fill("5");
  await page.getByRole("button", { name: "重新布置", exact: true }).click();
  await page.getByRole("button", { name: "开始战斗", exact: true }).click();
  await page.getByRole("button", { name: "抽取先攻", exact: true }).click();
  await page.getByLabel("技能", { exact: true }).selectOption("hero_skill:p010");
  await expect(page.getByText("目标：自身 · CRUSADER", { exact: true })).toBeVisible();
  await expect(page.getByLabel("目标", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "使用技能", exact: true }).click();
  await expect(page.getByTestId("entity-hero-0")).toContainText("防护 / 2t；标记 / 3t");
  await expect(page.getByTestId("rng-status")).toContainText("RNG 游标 4");
  await expect(page.getByTestId("turn-status")).toContainText("剩余 1 行动");
  await page.screenshot({ path: testInfo.outputPath("status-self-result.png"), fullPage: true });
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
});

test("英雄射程拒绝后移动攻击，胜利停场且同种子回放一致", async ({ page }) => {
  test.setTimeout(90000);
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
  // 同一条单场流程冒烟覆盖另外两种已核实怪物组合，真实按钮走完四轮撤退。
  for (const layout of ["pair", "trio"]) {
    await page.getByLabel("测试布置", { exact: true }).selectOption(layout);
    await page.getByRole("button", { name: "重新布置", exact: true }).click();
    await expect(page.getByTestId("area-B")).toContainText("Bone Rabble");
    if (layout === "trio")
      await expect(page.getByTestId("entity-courtier")).toContainText("Dodge 1");
    await page.getByRole("button", { name: "开始战斗", exact: true }).click();
    let breakthroughUsed = false;
    for (let step = 0; step < 160; step += 1) {
      const turn = await page.getByTestId("turn-status").innerText();
      if (turn.includes("撤退")) break;
      const choice = page.getByRole("group", { name: /待选决策/ });
      if (await choice.count()) await choice.getByRole("button").first().click();
      else if (await page.getByRole("button", { name: "结算位移", exact: true }).count())
        await page.getByRole("button", { name: "结算位移", exact: true }).click();
      else if (turn.includes("等待抽取先攻"))
        await page.getByRole("button", { name: "抽取先攻", exact: true }).click();
      else if (turn.includes("怪物回合")) {
        for (const name of ["怪物选招与选目标", "怪物移动到射程", "结算怪物技能"]) {
          const button = page.getByRole("button", { name, exact: true });
          if (await button.count()) {
            await button.click();
            break;
          }
        }
      } else {
        const stance = await page
          .locator(".stance-slot")
          .filter({ hasText: "← 当前" })
          .locator(":scope > span")
          .innerText();
        if (!breakthroughUsed && turn.startsWith("HELLION") && ["远程", "支援"].includes(stance)) {
          await page.getByLabel("技能", { exact: true }).selectOption("hero_skill:p034");
          await page.getByLabel("目标区域", { exact: true }).selectOption("B");
          for (const checkbox of await page.getByRole("checkbox").all()) await checkbox.check();
          await page.getByRole("button", { name: "使用技能", exact: true }).click();
          await expect(page.getByRole("region", { name: "战斗日志" })).toContainText(
            "英雄多目标技能已共用一次掷骰结算",
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
    expect(breakthroughUsed).toBe(true);
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
