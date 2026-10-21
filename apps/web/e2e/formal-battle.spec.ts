import { expect, test } from "@playwright/test";

test("S2/S3：正式同页战斗与底栏技能、分页和移动", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const click = (name: string) => page.getByRole("button", { name, exact: true }).click();
  await page.getByLabel("任务种子", { exact: true }).fill("1");
  await page.getByLabel("任务模式", { exact: true }).selectOption("radiant");
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
  await click("结算回合开始效果");
  await expect(page.getByTestId("turn-status")).toContainText(/剩余 .* 行动|怪物回合/);
  const dock = page.getByTestId("tabletop-action-dock");
  await expect(dock.getByRole("complementary", { name: "行动面板" })).toBeVisible();
  await expect(page.getByTestId("tabletop-formal-center").getByLabel("行动面板")).toHaveCount(0);
  const hand = dock.getByRole("listbox", { name: "手牌技能" });
  await expect(hand.getByRole("button")).toHaveCount(3);
  await hand.getByRole("button", { name: "Zealous Accusation I", exact: true }).click();
  await expect(dock.getByRole("group", { name: "同区目标" })).toBeVisible();
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
    await page.screenshot({ path: testInfo.outputPath(`s3-battle-${width}.png`) });
  }
  await dock.getByRole("tab", { name: "移动", exact: true }).click();
  await dock.getByRole("button", { name: "前往 I6", exact: true }).click();
  await dock.getByRole("button", { name: "确认移动", exact: true }).click();
  await expect(page.getByTestId("entity-hero-0")).toContainText("区域 I6");
  await expect(page.getByTestId("turn-status")).toHaveText("等待抽取先攻");
  await expect(hand).toHaveCount(0);
  await expect(dock.getByRole("button", { name: "抽取先攻", exact: true })).toBeVisible();
});
