import { expect, test } from "@playwright/test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { naturalAbbeyQuest } from "../../../packages/engine/src/test-helpers/abbey-quest";
import type { ApplyResult } from "../../../packages/engine/src/command";
import type { QuestSave } from "../../../packages/data/src/quest-save";
import type { caregiversQuest } from "../../../packages/engine/src/test-helpers/caregivers-quest";
import type { townFairQuest } from "../../../packages/engine/src/test-helpers/town-fair-quest";
import type { laborQuest } from "../../../packages/engine/src/test-helpers/labor-quest";

test("Phase 4：真实任务村庄怪癖、Survivalist奖励与Chant次日保存刷新", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  // Vite处理引擎的TS/JSON模块，与浏览器一致；不改引擎的纯TS依赖。
  const server = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  let journey: ReturnType<typeof naturalAbbeyQuest>, result: ApplyResult;
  let medicalSave: QuestSave;
  let caregivers: ReturnType<typeof caregiversQuest>;
  let townFair: ReturnType<typeof townFairQuest>, fairResult: ApplyResult;
  let labor: ReturnType<typeof laborQuest>;
  try {
    const helpers = await server.ssrLoadModule(
      fileURLToPath(
        new URL("../../../packages/engine/src/test-helpers/abbey-quest.ts", import.meta.url),
      ),
    );
    const engine = await server.ssrLoadModule(
      fileURLToPath(new URL("../../../packages/engine/src/command.ts", import.meta.url)),
    );
    const plugin = await server.ssrLoadModule(
      fileURLToPath(new URL("../battle-data-plugin.ts", import.meta.url)),
    );
    const code = plugin.battleDataPlugin().load("\0virtual:battle-data");
    const battleData = JSON.parse(code.slice("export const battleData = ".length, -1));
    // 同一正式网页目录：只读取获批卡，不把引擎测试的更大目录写入浏览器存档。
    const sourceHelpers = await server.ssrLoadModule(
      fileURLToPath(
        new URL("../../../packages/engine/src/test-helpers/core-quest.ts", import.meta.url),
      ),
    );
    journey = helpers.naturalAbbeyQuest({
      ...battleData,
      trinkets: sourceHelpers.coreQuestSources.catalog.trinkets,
    });
    const medical = await server.ssrLoadModule(
      fileURLToPath(
        new URL("../../../packages/engine/src/test-helpers/medical-quest.ts", import.meta.url),
      ),
    );
    medicalSave = medical.medicalQuest({
      ...sourceHelpers.coreQuestSources,
      catalog: { ...battleData, trinkets: sourceHelpers.coreQuestSources.catalog.trinkets },
    }).save;
    const caregiversHelper = await server.ssrLoadModule(
      fileURLToPath(
        new URL("../../../packages/engine/src/test-helpers/caregivers-quest.ts", import.meta.url),
      ),
    );
    caregivers = caregiversHelper.caregiversQuest({
      ...sourceHelpers.coreQuestSources,
      catalog: { ...battleData, trinkets: sourceHelpers.coreQuestSources.catalog.trinkets },
    });
    const fairHelper = await server.ssrLoadModule(
      fileURLToPath(
        new URL("../../../packages/engine/src/test-helpers/town-fair-quest.ts", import.meta.url),
      ),
    );
    townFair = fairHelper.townFairQuest({
      ...sourceHelpers.coreQuestSources,
      catalog: { ...battleData, trinkets: sourceHelpers.coreQuestSources.catalog.trinkets },
    });
    fairResult = engine.applyCommand(townFair.game, { type: "drawHamletEvent" });
    const laborHelper = await server.ssrLoadModule(
      fileURLToPath(
        new URL("../../../packages/engine/src/test-helpers/labor-quest.ts", import.meta.url),
      ),
    );
    labor = laborHelper.laborQuest({
      ...sourceHelpers.coreQuestSources,
      catalog: { ...battleData, trinkets: sourceHelpers.coreQuestSources.catalog.trinkets },
    });
    expect(fairResult.events.some((event) => event.type === "commandRefused")).toBe(false);
    result = engine.applyCommand(journey.game, {
      type: "visitHamletBuilding",
      actorId: "hero-0",
      serviceId: "abbeyPositiveQuirk",
      quirkIds: [],
    });
  } finally {
    await server.close();
  }
  // 安装由真实完整命令生成、经回放核验的存档；不安装任意游戏快照。
  await page.goto("/?phase=3&play=1");
  await page.evaluate(
    (save) => localStorage.setItem("ddbg.core-quest.save.v1", save),
    JSON.stringify(journey.save),
  );
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await page.getByRole("button", { name: "升级生存专家（20 金）", exact: true }).click();
  await expect(page.getByTestId("hamlet-buildings")).toContainText("生存专家 II");
  const gold = journey.game.dungeon!.gold - 20;
  await expect(page.getByTestId("hamlet-buildings")).toContainText("修道院 II");
  await page
    .getByRole("button", { name: "修道院 II：获得 1 张正面怪癖（3 金）", exact: true })
    .click();
  expect(result.pendingChoice).toBeDefined();
  await expect(
    page.getByText("修道院获得第四怪癖：选择替换已有正面怪癖，或弃置新卡", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("dungeon-gold")).toHaveText(`共享金币：${gold - 3}`);
  await expect(page.getByLabel("村庄行动").getByRole("button")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "升级酒馆（20 金）", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("已保存到本机");
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByTestId("dungeon-gold")).toHaveText(`共享金币：${gold - 3}`);
  const discard = result.pendingChoice!.options.find((o) => o.label.includes("弃置新卡"))!;
  await page.getByRole("button", { name: discard.label, exact: true }).click();
  await expect(page.getByTestId("hamlet-event")).toContainText(/当前行动英雄：\s*HELLION/);
  await expect(page.getByTestId("dungeon-gold")).toHaveText(`共享金币：${gold - 3}`);
  await expect(page.getByRole("button", { name: discard.label, exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("abbey-choice-complete.png"), fullPage: true });
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByTestId("hamlet-event")).toContainText(/当前行动英雄：\s*HELLION/);
  await expect(page.getByTestId("dungeon-gold")).toHaveText(`共享金币：${gold - 3}`);
  await page.getByRole("button", { name: "Intimidate：移出当天看守人", exact: true }).click();
  await page
    .getByRole("button", { name: "生存专家 II：下次任务 +2 颗补给骰（3 金）", exact: true })
    .click();
  await expect(page.getByTestId("next-quest-provisions")).toContainText("hero-2 +2");
  await expect(page.getByTestId("hamlet-event")).toContainText(/当前行动英雄：\s*VESTAL/);
  await expect(
    page.getByRole("button", { name: "Pray：自身压力 −9，Debuff 6t", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Chant：全体压力 −1，Buff 3t", exact: true }).click();
  await page.getByRole("button", { name: "开始第 2 天看守人", exact: true }).click();
  await expect(page.getByTestId("hamlet-event")).toContainText("当前第 2 天");
  await expect(page.getByTestId("dungeon-gold")).toHaveText(`共享金币：${gold - 6}`);
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  const storedStacks = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("ddbg.core-quest.save.v1")!).snapshot.dungeon.heroes.map(
      (h: { statusStacks: { kind: string; remaining: number }[] }) => h.statusStacks,
    ),
  );
  expect(storedStacks).toEqual(Array.from({ length: 4 }, () => [{ kind: "buff", remaining: 3 }]));
  await expect(page.getByTestId("dungeon-gold")).toHaveText(`共享金币：${gold - 6}`);
  await expect(page.getByTestId("next-quest-provisions")).toContainText("hero-2 +2");
  await page.screenshot({ path: testInfo.outputPath("vestal-chant-saved.png"), fullPage: true });
  // 同一冒烟追加真实seed10事件路径，未注入疾病或状态。
  await page.evaluate(
    (save) => localStorage.setItem("ddbg.core-quest.save.v1", save),
    JSON.stringify(medicalSave),
  );
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await page.getByRole("button", { name: "抽村庄事件", exact: true }).click();
  await expect(page.getByTestId("hamlet-event")).toContainText("Medical Breakthrough");
  await expect(page.getByTestId("hamlet-event")).toContainText("村庄事件牌堆 16 张");
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await page.getByRole("button", { name: "开始首日看守人", exact: true }).click();
  await expect(page.getByTestId("hamlet-event")).toContainText("准备 3 天");
  await page.screenshot({
    path: testInfo.outputPath("medical-breakthrough-saved.png"),
    fullPage: true,
  });
  // 真实seed14任务和回村日志，保存于事件第一名英雄待选；不注入持牌或状态。
  await page.evaluate(
    (save) => localStorage.setItem("ddbg.core-quest.save.v1", save),
    JSON.stringify(caregivers.save),
  );
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByTestId("hamlet-event")).toContainText("Caregivers Convention");
  await expect(page.getByTestId("hamlet-event")).toContainText("村庄事件牌堆 15 张");
  await expect(page.getByRole("button", { name: "开始首日看守人", exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: caregivers.game.dungeon!.pending!.options[0]!.label, exact: true })
    .click();
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(
    page.getByText("Caregivers Convention：hero-2可免费移除一张怪癖，或放弃（卡面p12）", {
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("caregivers-pending-saved.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "放弃移除怪癖", exact: true }).click();
  await expect(
    page.getByText("Caregivers Convention：hero-3可免费移除一张怪癖，或放弃（卡面p12）", {
      exact: true,
    }),
  ).toBeVisible();
  const positive = caregivers.game.dungeon!.conditions!.quirks.find(
    (quirk) => quirk.id === "quirk:p010",
  )!.name;
  await page.getByRole("button", { name: `移除 ${positive}`, exact: true }).click();
  await expect(page.getByTestId("hamlet-event")).toContainText("村庄事件牌堆 16 张");
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  const storedQuirks = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("ddbg.core-quest.save.v1")!).snapshot.dungeon.heroes.map(
      (hero: { quirkIds: string[] }) => hero.quirkIds,
    ),
  );
  expect(storedQuirks).toEqual([[], [], ["quirk:p007"], ["quirk:p034"]]);
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByTestId("dungeon-gold")).toHaveText(
    `共享金币：${caregivers.game.dungeon!.gold}`,
  );
  await page.getByRole("button", { name: "开始首日看守人", exact: true }).click();
  await expect(page.getByTestId("hamlet-event")).toContainText("准备 2 天");
  await page.screenshot({
    path: testInfo.outputPath("caregivers-complete-saved.png"),
    fullPage: true,
  });
  // 真实seed64任务日志，页面实际抽出并结算Town Fair；保存刷新不重复治疗或减压。
  await page.evaluate(
    (save) => localStorage.setItem("ddbg.core-quest.save.v1", save),
    JSON.stringify(townFair.save),
  );
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await page.getByRole("button", { name: "抽村庄事件", exact: true }).click();
  await expect(page.getByTestId("hamlet-event")).toContainText("Town Fair");
  await expect(page.getByTestId("hamlet-event")).toContainText("治疗 2 × 自身英雄等级");
  await expect(page.getByTestId("hamlet-event")).toContainText("村庄事件牌堆 16 张");
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  const fairHealth = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("ddbg.core-quest.save.v1")!).snapshot.dungeon.heroes.map(
      (hero: { wounds: number; stress: number }) => [hero.wounds, hero.stress],
    ),
  );
  const expectedHealth = townFair.game.dungeon!.heroes.map((hero) => [
    Math.max(0, hero.wounds! - 2),
    Math.max(0, hero.stress - 3),
  ]);
  expect(fairHealth).toEqual(expectedHealth);
  expect(fairResult.state.dungeon!.heroes.map((hero) => [hero.wounds, hero.stress])).toEqual(
    expectedHealth,
  );
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  const restoredHealth = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("ddbg.core-quest.save.v1")!).snapshot.dungeon.heroes.map(
      (hero: { wounds: number; stress: number }) => [hero.wounds, hero.stress],
    ),
  );
  expect(restoredHealth).toEqual(fairHealth);
  await expect(page.getByTestId("dungeon-gold")).toHaveText(
    `共享金币：${townFair.game.dungeon!.gold}`,
  );
  await page.getByRole("button", { name: "开始首日看守人", exact: true }).click();
  await expect(page.getByTestId("hamlet-event")).toContainText("准备 1 天");
  await page.screenshot({ path: testInfo.outputPath("town-fair-saved.png"), fullPage: true });
  // 同一真实seed64回村：用真实22金升级驿站，不消耗当前英雄行动；保存刷新不重复发放。
  await expect(page.getByTestId("stagecoach-tokens")).toContainText("驿站等待英雄代币：2 枚");
  const actorLabel = page
    .getByTestId("hamlet-event")
    .locator("p")
    .filter({ hasText: "当前行动英雄：" });
  const currentActor = await actorLabel.innerText();
  await page.getByRole("button", { name: "升级驿站（20 金）", exact: true }).click();
  await expect(page.getByTestId("hamlet-buildings")).toContainText("驿站 II");
  await expect(page.getByTestId("stagecoach-tokens")).toContainText("驿站等待英雄代币：3 枚");
  await expect(page.getByTestId("dungeon-gold")).toHaveText(
    `共享金币：${townFair.game.dungeon!.gold - 20}`,
  );
  await expect(actorLabel).toHaveText(currentActor);
  await expect(page.getByRole("button", { name: "升级驿站（20 金）", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByTestId("stagecoach-tokens")).toContainText("驿站等待英雄代币：3 枚");
  await expect(page.getByTestId("hamlet-buildings")).toContainText("驿站 II");
  await expect(page.getByTestId("dungeon-gold")).toHaveText(
    `共享金币：${townFair.game.dungeon!.gold - 20}`,
  );
  await expect(actorLabel).toHaveText(currentActor);
  await page.screenshot({
    path: testInfo.outputPath("stagecoach-upgrade-saved.png"),
    fullPage: true,
  });
  // 同一条村庄冒烟：真实seed11入口离开日志，未伪装成完成任务。
  await page.evaluate(
    (save) => localStorage.setItem("ddbg.core-quest.save.v1", save),
    JSON.stringify(labor.save),
  );
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await page.getByRole("button", { name: "抽村庄事件", exact: true }).click();
  await expect(page.getByTestId("hamlet-event")).toContainText("Labor Force");
  await expect(page.getByTestId("hamlet-event")).toContainText("请选择免费升级一栋建筑");
  await expect(page.getByRole("button", { name: "升级酒馆（20 金）", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await page
    .getByRole("button", { name: "免费升级酒馆至II级；本次村庄准备期间不可访问", exact: true })
    .click();
  await expect(page.getByTestId("hamlet-buildings")).toContainText("酒馆 II");
  await expect(page.getByTestId("hamlet-event")).toContainText("永久移出 1 张");
  await expect(page.getByTestId("hamlet-week-blocked")).toContainText("酒馆");
  await expect(page.getByTestId("dungeon-gold")).toHaveText(
    `共享金币：${labor.game.dungeon!.gold}`,
  );
  await page.getByRole("button", { name: "开始首日看守人", exact: true }).click();
  await page
    .getByRole("button", { name: "Zealous Speech：全体压力 −5，结束当天", exact: true })
    .click();
  await page.getByRole("button", { name: "开始第 2 天看守人", exact: true }).click();
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByTestId("hamlet-week-blocked")).toContainText("酒馆");
  await expect(page.getByTestId("hamlet-event")).toContainText("永久移出 1 张");
  await expect(page.getByRole("button", { name: /酒馆 II：压力/ })).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("labor-force-day2-saved.png"),
    fullPage: true,
  });
  // 真实seed2任务提前退出/零XP回村日志：首次墓地访问免费获得美德，刷新不重复抽卡。
  await page.evaluate(
    (save) => localStorage.setItem("ddbg.core-quest.save.v1", save),
    JSON.stringify(journey.save),
  );
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await page
    .getByRole("button", { name: "墓地：免费获得美德；下次压力到10直接死亡", exact: true })
    .click();
  await expect(page.getByTestId("hamlet-virtues")).toContainText("hero-0");
  await expect(page.getByTestId("dungeon-gold")).toHaveText(
    `共享金币：${journey.game.dungeon!.gold}`,
  );
  await expect(page.getByTestId("hamlet-event")).toContainText(/当前行动英雄：\s*HELLION/);
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  const virtueLabel = await page.getByTestId("hamlet-virtues").innerText();
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByTestId("hamlet-virtues")).toHaveText(virtueLabel);
  await expect(
    page.getByRole("button", { name: "墓地：免费获得美德；下次压力到10直接死亡", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("graveyard-virtue-saved.png"),
    fullPage: true,
  });
});
