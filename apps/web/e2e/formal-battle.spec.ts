import { expect, test } from "@playwright/test";

test("S2：正式探索遇敌同页展开，先攻只读且 1280 无横向溢出", async ({ page }, testInfo) => {
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
  for (const width of [1280, 1920]) {
    await page.setViewportSize({ width, height: width === 1280 ? 800 : 1080 });
    await page.locator(".tt-formal-center__scroll").evaluate((node) => {
      node.scrollTop = 0;
    });
    const overflow = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          ".tt-root, .tt-formal-center__scroll, .shell--formal-battle, .shell--formal-battle .workspace, .shell--formal-battle .area-grid",
        ),
      ].some((node) => node.scrollWidth > node.clientWidth + 1),
    );
    expect(overflow).toBe(false);
    await page.screenshot({ path: testInfo.outputPath(`s2-battle-${width}.png`) });
  }
});
