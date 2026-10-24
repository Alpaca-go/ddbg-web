import { expect, test } from "@playwright/test";

test("S2/S3：正式同页战斗与底栏技能、分页和移动", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  page.setDefaultTimeout(10_000);
  const capture = async (stage: string) => {
    for (const width of [1280, 1920]) {
      await page.setViewportSize({ width, height: width === 1280 ? 800 : 1080 });
      await page.screenshot({ path: testInfo.outputPath(`detail-${stage}-${width}.png`) });
    }
  };
  const duplicateKeys: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("same key")) duplicateKeys.push(message.text());
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const click = (name: string) => page.getByRole("button", { name, exact: true }).click();
  await page.getByTestId("embark-mode-radiant").click();
  await click("前往出征准备");
  await click("进入地牢");
  await click("掷开局补给骰");
  const choice = page.getByTestId("dungeon-pending-choice");
  for (let step = 0; step < 100; step++) {
    if (await page.getByRole("button", { name: "进入房间战斗", exact: true }).count()) break;
    if (await choice.count()) {
      await choice.getByRole("button").first().click();
      continue;
    }
    let advanced = false;
    for (const name of [
      "选择下一段探索",
      "掷探索骰并开始结算",
      "抽房间牌并匹配战斗板块",
      "从完整 42 张怪物池抽牌并记录部署",
      "结算当前 Curio",
      "结算 Curio 守卫骰 房间",
      "结算 Dark 房间",
      "结算 Trap 房间",
    ]) {
      const button = page.getByRole("button", { name, exact: true });
      if ((await button.count()) && (await button.isEnabled())) {
        await button.click();
        advanced = true;
        break;
      }
    }
    if (!advanced) throw new Error(await page.getByTestId("tabletop-formal-center").innerText());
  }
  await expect(page.getByTestId("formal-dungeon-exploration")).toBeVisible();
  await page
    .getByTestId("tabletop-formal-center")
    .locator(".tt-formal-center__scroll")
    .evaluate((node) => {
      node.scrollTop = 0;
    });
  await page.screenshot({ path: testInfo.outputPath("s2-before-battle-1280.png") });
  await click("保存进度");
  await click("进入房间战斗");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("tabletop-view")).toHaveAttribute("data-formal-flow", "1");
  await expect(page.getByRole("region", { name: "站位轨道" })).toBeVisible();
  await expect(page.getByRole("region", { name: "区域板" })).toBeVisible();
  await expect(page.getByTestId("tabletop-initiative")).toContainText("第 — / 4 轮");
  await click("开始战斗");
  const remaining = page.getByTestId("formal-initiative-remaining");
  const before = Number((await remaining.innerText()).match(/\d+/)![0]);
  await click("抽取先攻");
  await expect(remaining).toContainText(`余牌 ${before - 1} 张`);
  await expect(page.getByTestId("tabletop-turn-actor")).not.toContainText("等待抽取先攻");
  await expect(page.getByLabel("当前翻开先攻")).toContainText(/英|怪/);
  await expect(
    page.getByRole("list", { name: "回合轨" }).locator('[aria-current="step"]'),
  ).toHaveText("1");
  await page.getByTestId("tabletop-hero-row-hero-0").click();
  await expect(page.getByTestId("tabletop-detail")).toBeInViewport();
  const detailBox = await page.getByTestId("tabletop-detail").boundingBox();
  const dockBox = await page.getByTestId("tabletop-action-dock").boundingBox();
  expect(detailBox!.y + detailBox!.height).toBeLessThanOrEqual(dockBox!.y);
  await page.getByRole("button", { name: "关闭详情", exact: true }).click();
  await expect(page.getByRole("group", { name: "待选决策 · 当前玩家" })).toBeVisible();
  await click("结算回合开始效果");
  await expect(page.getByTestId("turn-status")).toContainText(/剩余 .* 行动|怪物回合/);
  const dock = page.getByTestId("tabletop-action-dock");
  await expect(page.getByTestId("tabletop-draw-initiative")).toHaveCount(0);
  await expect(dock.getByRole("complementary", { name: "行动面板" })).toBeVisible();
  await expect(page.getByTestId("tabletop-formal-center").getByLabel("行动面板")).toHaveCount(0);
  const hand = dock.getByRole("listbox", { name: "手牌技能" });
  await expect(hand.getByRole("button")).toHaveCount(3);
  const skillTab = dock.getByRole("tab", { name: "技能", exact: true });
  await skillTab.focus();
  await skillTab.press("ArrowRight");
  await expect(dock.getByRole("tab", { name: "移动", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await dock.getByRole("tab", { name: "移动", exact: true }).press("ArrowLeft");
  await expect(skillTab).toHaveAttribute("aria-selected", "true");
  await hand.getByRole("button", { name: "Zealous Accusation I", exact: true }).click();
  await expect(dock.getByRole("group", { name: "同区目标" })).toBeVisible();
  const chosenTarget = dock.getByLabel("选择 HELLION", { exact: true });
  await chosenTarget.check();
  await page.getByTestId("tabletop-hero-row-hero-0").click();
  const statuses = page.getByTestId("tabletop-detail-hero-status").locator("li");
  expect(
    await page
      .getByTestId("tabletop-hero-row-hero-0")
      .locator(".tt-condition-chip")
      .allTextContents(),
  ).toEqual(await statuses.allTextContents());
  await page.keyboard.press("Escape");
  await expect(chosenTarget).toBeChecked();
  for (const [tab, legend] of [
    ["移动", "移动 · Speed"],
    ["换姿态", "向后换姿态"],
    ["战利品", "拾取同区宝箱"],
    ["补给", "免费使用补给"],
  ]) {
    await dock.getByRole("tab", { name: tab!, exact: true }).click();
    await expect(dock.getByRole("tabpanel")).toContainText(legend!);
    await expect(hand).not.toBeVisible();
  }
  await dock.getByRole("tab", { name: "技能", exact: true }).click();
  await hand.getByRole("button", { name: "Smite I", exact: true }).click();
  await hand.getByRole("button", { name: "Zealous Accusation I", exact: true }).click();
  await dock.getByLabel("选择空区域", { exact: true }).check();
  await dock.getByLabel("空区域", { exact: true }).selectOption("I6");
  await dock.getByRole("button", { name: "使用技能", exact: true }).click();
  await expect(page.getByTestId("turn-status")).toContainText("剩余 1 行动");
  await expect(
    hand.getByRole("button", { name: "Zealous Accusation I", exact: true }),
  ).toBeDisabled();
  await expect(hand).toContainText("本回合已用");
  for (const width of [1280, 1920]) {
    await page.setViewportSize({ width, height: width === 1280 ? 800 : 1080 });
    await page.locator(".tt-formal-center__scroll").evaluate((node) => {
      node.scrollTop = 0;
    });
    const overflow = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          ".tt-root, .tt-formal-center__scroll, .shell--formal-battle, .shell--formal-battle .workspace, .shell--formal-battle .area-grid, .tt-battle-actions__body",
        ),
      ].some((node) => node.scrollWidth > node.clientWidth + 1),
    );
    expect(overflow).toBe(false);
    const heroesFit = await page
      .getByTestId("tabletop-party")
      .evaluate((party) =>
        [...party.querySelectorAll("button")].every(
          (row) => row.getBoundingClientRect().bottom <= party.getBoundingClientRect().bottom,
        ),
      );
    expect(heroesFit).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`s3-battle-${width}.png`) });
  }
  await dock.getByRole("tab", { name: "移动", exact: true }).click();
  await dock.getByRole("button", { name: "前往 I6", exact: true }).click();
  const pathText = await dock.getByRole("tabpanel").locator("p").first().innerText();
  await page.getByTestId("tabletop-hero-row-hero-0").click();
  await page.keyboard.press("Escape");
  await expect(dock.getByRole("tabpanel").locator("p").first()).toHaveText(pathText);
  await dock.getByRole("button", { name: "确认移动", exact: true }).click();
  await expect(page.getByTestId("entity-hero-0")).toContainText("区域 I6");
  await expect(page.getByTestId("turn-status")).toHaveText("等待抽取先攻");
  await expect(hand).toHaveCount(0);
  await expect(dock.getByRole("button", { name: "抽取先攻", exact: true })).toBeVisible();
  expect(duplicateKeys).toEqual([]);
  // 按真实动作耗尽四轮；跨阶段只淘汰失效详情，保留仍在队伍中的英雄。
  const finishBattle = async () => {
    for (let step = 0; step < 240; step++) {
      if (await page.getByRole("button", { name: "返回地牢地图", exact: true }).count()) break;
      const choice = page.locator("fieldset.choice button").first();
      if (await choice.count()) {
        await choice.click();
        continue;
      }
      const stance = dock.getByRole("tab", { name: "换姿态", exact: true });
      if ((await stance.isVisible()) && (await stance.isEnabled())) await stance.click();
      await page
        .getByRole("button", {
          name: /^(结算位移|抽取先攻|向前换姿态|向后换姿态|怪物选招与选目标|按 The Invokers 移动|怪物选招／执行自身技能|怪物移动到射程|结算怪物技能)$/,
        })
        .and(page.locator(":enabled"))
        .first()
        .click();
    }
  };
  await finishBattle();
  await page.getByTestId("tabletop-hero-row-hero-0").click();
  await click("返回地牢地图");
  await expect(page.getByTestId("tabletop-detail-hero")).toBeVisible();
  await capture("battle-exit");
  await page.keyboard.press("Escape");
  await click("读取本机存档");
  await page.getByTestId("tabletop-current-room-card").click();
  await expect(page.getByTestId("tabletop-detail-room")).toBeVisible();
  await click("进入房间战斗");
  await click("开始战斗");
  await finishBattle();
  await click("返回地牢地图");
  for (
    let step = 0;
    step < 30 && !(await page.getByRole("button", { name: "离开地牢", exact: true }).isEnabled());
    step++
  ) {
    const choice = page.getByTestId("dungeon-pending-choice").getByRole("button");
    if (await choice.count()) await choice.first().click();
    else
      await page
        .getByRole("button", { name: /^(准备驿站替补|让\d名替补入队并继续)$/ })
        .and(page.locator(":enabled"))
        .first()
        .click();
  }
  await click("离开地牢");
  await click("全员同意离开");
  await capture("return");
  await expect.soft(page.getByTestId("tabletop-detail")).toHaveCount(0);
  await click("生成任务结算摘要");
  await click("返回村庄");
  await click("兑换剩余补给并完成回村");
  await click("抽村庄事件");
  await expect(page.getByTestId("tabletop-view")).toHaveAttribute("data-phase", "hamlet");
  await capture("hamlet");
  await expect(page.getByTestId("tabletop-detail")).toHaveCount(0);
  await click("读取本机存档");
  await expect(page.getByTestId("tabletop-detail")).toHaveCount(0);
  await page.getByTestId("tabletop-hero-row-hero-0").click();
  await page.getByRole("button", { name: "关闭详情", exact: true }).click();
  await expect(page.getByTestId("tabletop-detail")).toHaveCount(0);
});
