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
  await page.getByLabel("技能", { exact: true }).selectOption("hero_skill:p010");
  await expect(page.getByText("目标：自身 · CRUSADER", { exact: true })).toBeVisible();
  await expect(page.getByLabel("目标", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "使用技能", exact: true }).click();
  await expect(page.getByTestId("entity-hero-0")).toContainText("防护 / 2t；标记 / 3t");
  await expect(page.getByTestId("rng-status")).toContainText("RNG 游标 4");
  await expect(page.getByTestId("turn-status")).toContainText("剩余 1 行动");
  await page.screenshot({ path: testInfo.outputPath("status-self-result.png"), fullPage: true });
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

test("英雄射程拒绝后移动攻击，胜利停场且同种子回放一致", async ({ page }, testInfo) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1440, height: 1050 });
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
          .locator(".stance-slot")
          .filter({ hasText: "← 当前" })
          .locator(":scope > span")
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
    await expect(page.getByTestId("step-hint")).toContainText("单场结束");
    if (formal) {
      expect(lootUsed).toBe(true);
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
    expect(log.match(/d10=/g)).toHaveLength(1);
    expect(log.match(/怪物全灭，战斗胜利/g)).toHaveLength(1);
    return log;
  }
  // 种子 5 为暴击、种子 4 为普通命中；均杀死末只怪物，但先完成自身位移。
  const first = await choose("5", "E");
  expect(await choose("5", "E")).toBe(first);
  await choose("4", "B");
});
