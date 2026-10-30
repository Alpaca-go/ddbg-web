import { expect, test } from "@playwright/test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { naturalAbbeyQuest } from "../../../packages/engine/src/test-helpers/abbey-quest";
import type { ApplyResult } from "../../../packages/engine/src/command";
import type { QuestSave } from "../../../packages/data/src/quest-save";
import type { caregiversQuest } from "../../../packages/engine/src/test-helpers/caregivers-quest";
import type { townFairQuest } from "../../../packages/engine/src/test-helpers/town-fair-quest";
import type { paidUpgradeQuest } from "../../../packages/engine/src/test-helpers/natural-scout-return";
import type { laborQuest } from "../../../packages/engine/src/test-helpers/labor-quest";
import type { nomadQuest } from "../../../packages/engine/src/test-helpers/nomad-quest";
import type { nomadSaleQuest } from "../../../packages/engine/src/test-helpers/nomad-sale-quest";
import type { guildQuest } from "../../../packages/engine/src/test-helpers/guild-quest";
import type { twoQuestGuildPath } from "../../../packages/engine/src/test-helpers/two-quest-guild";
import type { nomadUpgradeQuest } from "../../../packages/engine/src/test-helpers/nomad-upgrade-quest";

test("Phase 4：真实任务村庄怪癖、Survivalist奖励与Chant次日保存刷新", async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
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
  let funded: ReturnType<typeof paidUpgradeQuest>;
  let labor: ReturnType<typeof laborQuest>;
  let nomad: ReturnType<typeof nomadQuest>;
  let nomadSale: ReturnType<typeof nomadSaleQuest>;
  let guild: ReturnType<typeof guildQuest>;
  let naturalGuild: ReturnType<typeof twoQuestGuildPath>;
  let higherNomad: ReturnType<typeof nomadUpgradeQuest>, higherNomadSave: QuestSave;
  let replacementSave: QuestSave;
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
    const code = plugin.battleDataPlugin().load("\0virtual:quest-battle-data");
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
    const fundedHelper = await server.ssrLoadModule(
      fileURLToPath(
        new URL(
          "../../../packages/engine/src/test-helpers/natural-scout-return.ts",
          import.meta.url,
        ),
      ),
    );
    funded = fundedHelper.paidUpgradeQuest({
      ...sourceHelpers.coreQuestSources,
      catalog: { ...battleData, trinkets: sourceHelpers.coreQuestSources.catalog.trinkets },
    });
    const laborHelper = await server.ssrLoadModule(
      fileURLToPath(
        new URL("../../../packages/engine/src/test-helpers/labor-quest.ts", import.meta.url),
      ),
    );
    labor = laborHelper.laborQuest({
      ...sourceHelpers.coreQuestSources,
      catalog: { ...battleData, trinkets: sourceHelpers.coreQuestSources.catalog.trinkets },
    });
    const nomadHelper = await server.ssrLoadModule(
      fileURLToPath(
        new URL("../../../packages/engine/src/test-helpers/nomad-quest.ts", import.meta.url),
      ),
    );
    nomad = nomadHelper.nomadQuest({
      ...battleData,
      trinkets: sourceHelpers.coreQuestSources.catalog.trinkets,
    });
    const saleHelper = await server.ssrLoadModule(
      fileURLToPath(
        new URL("../../../packages/engine/src/test-helpers/nomad-sale-quest.ts", import.meta.url),
      ),
    );
    nomadSale = saleHelper.nomadSaleQuest({
      ...battleData,
      trinkets: sourceHelpers.coreQuestSources.catalog.trinkets,
    });
    const higherHelper = await server.ssrLoadModule(
      fileURLToPath(
        new URL(
          "../../../packages/engine/src/test-helpers/nomad-upgrade-quest.ts",
          import.meta.url,
        ),
      ),
    );
    higherNomad = higherHelper.nomadUpgradeQuest(3, {
      ...battleData,
      trinkets: sourceHelpers.coreQuestSources.catalog.trinkets,
    });
    const saveModule = await server.ssrLoadModule(
      fileURLToPath(new URL("../../../packages/engine/src/quest-save.ts", import.meta.url)),
    );
    higherNomadSave = saveModule.createQuestSave(
      higherNomad.start,
      higherNomad.commands,
      higherNomad.game,
      {
        ...sourceHelpers.coreQuestSources,
        catalog: { ...battleData, trinkets: sourceHelpers.coreQuestSources.catalog.trinkets },
      },
    );
    const guildHelper = await server.ssrLoadModule(
      fileURLToPath(
        new URL("../../../packages/engine/src/test-helpers/guild-quest.ts", import.meta.url),
      ),
    );
    guild = guildHelper.guildQuest({
      ...sourceHelpers.coreQuestSources,
      catalog: { ...battleData, trinkets: sourceHelpers.coreQuestSources.catalog.trinkets },
    });
    const naturalGuildHelper = await server.ssrLoadModule(
      fileURLToPath(
        new URL("../../../packages/engine/src/test-helpers/two-quest-guild.ts", import.meta.url),
      ),
    );
    naturalGuild = naturalGuildHelper.twoQuestGuildPath({
      ...sourceHelpers.coreQuestSources,
      catalog: { ...battleData, trinkets: sourceHelpers.coreQuestSources.catalog.trinkets },
    });
    const natural = await server.ssrLoadModule(
      fileURLToPath(
        new URL("../../../packages/engine/src/test-helpers/natural-quest.ts", import.meta.url),
      ),
    );
    const legacyCode = plugin.battleDataPlugin().load("\0virtual:quest-battle-data-v1");
    const legacyBattleData = JSON.parse(legacyCode.slice("export const battleData = ".length, -1));
    const replacementSources = {
      ...sourceHelpers.coreQuestSources,
      catalog: { ...legacyBattleData, trinkets: sourceHelpers.coreQuestSources.catalog.trinkets },
    };
    const death = natural.naturalQuest(14, "quest:p001", true, replacementSources, 2, {
      observe(game: import("../../../packages/engine/src/command").GameState) {
        if (!game.battle && game.dungeon!.phase === "ready" && game.dungeon!.position !== "S")
          throw new Error("observed-room");
      },
    });
    expect(death.stopReason).toBe("observed-room");
    const deathStep = (command: import("../../../packages/engine/src/command").Command) => {
      const r = engine.applyCommand(death.state, command);
      expect(r.events.some((e: { type: string }) => e.type === "commandRefused")).toBe(false);
      death.state = r.state;
      death.commands.push(command);
    };
    for (
      let n = 0;
      !death.state.dungeon.heroes.some((h: { dead?: boolean }) => h.dead) && n < 25;
      n++
    ) {
      deathStep({ type: "scoutDungeon" });
      deathStep({
        type: "resolveChoice",
        choiceId: death.state.dungeon.pending.id,
        optionId: "agree",
      });
    }
    expect(death.state.dungeon.heroes.some((h: { dead?: boolean }) => h.dead)).toBe(true);
    while (death.state.dungeon.deathTrinketChoice)
      deathStep({
        type: "resolveChoice",
        choiceId: death.state.dungeon.deathTrinketChoice.id,
        optionId: "discard",
      });
    deathStep({ type: "prepareReplacementHero" });
    replacementSave = saveModule.createQuestSave(
      { seed: 14, questId: "quest:p001", mode: "radiant", party: natural.naturalParty },
      death.commands,
      death.state,
      replacementSources,
    );
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
  // 真实seed1任务和回村日志，保存于事件第一名英雄待选；不注入持牌或状态。
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
    page.getByText("Caregivers Convention：hero-1可免费移除一张怪癖，或放弃（卡面p12）", {
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("caregivers-pending-saved.png"),
    fullPage: true,
  });
  const positive = caregivers.game.dungeon!.conditions!.quirks.find(
    (quirk) => quirk.id === "quirk:p017",
  )!.name;
  await page.getByRole("button", { name: `移除 ${positive}`, exact: true }).click();
  await expect(
    page.getByText("Caregivers Convention：hero-2可免费移除一张怪癖，或放弃（卡面p12）", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "放弃移除怪癖", exact: true }).click();
  await expect(page.getByTestId("hamlet-event")).toContainText("村庄事件牌堆 16 张");
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  const storedQuirks = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("ddbg.core-quest.save.v1")!).snapshot.dungeon.heroes.map(
      (hero: { quirkIds: string[] }) => hero.quirkIds,
    ),
  );
  expect(storedQuirks).toEqual([
    ["quirk:p028"],
    ["quirk:p032", "quirk:p026"],
    ["quirk:p034", "quirk:p025"],
    [],
  ]);
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
  // 真实seed40任务日志，页面实际抽出并结算Town Fair；保存刷新不重复治疗或减压。
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
  // 独立真实seed6回村：30金足够支付驿站升级，不依赖Town Fair场景的金币。
  await page.evaluate(
    (save) => localStorage.setItem("ddbg.core-quest.save.v1", save),
    JSON.stringify(funded.save),
  );
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await page.getByRole("button", { name: "抽村庄事件", exact: true }).click();
  await page.getByRole("button", { name: "开始首日看守人", exact: true }).click();
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
    `共享金币：${funded.game.dungeon!.gold - 20}`,
  );
  await expect(actorLabel).toHaveText(currentActor);
  await expect(page.getByRole("button", { name: "升级驿站（20 金）", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByTestId("stagecoach-tokens")).toContainText("驿站等待英雄代币：3 枚");
  await expect(page.getByTestId("hamlet-buildings")).toContainText("驿站 II");
  await expect(page.getByTestId("dungeon-gold")).toHaveText(
    `共享金币：${funded.game.dungeon!.gold - 20}`,
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
  // 同一真实回村日志：Hellion二选一Sharpen Spear，只完成她当天的行动。
  await expect(
    page.getByRole("button", { name: "Intimidate：移出当天看守人", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sharpen Spear：自身 Buff 5t", exact: true }).click();
  await expect(page.getByTestId("hamlet-event")).toContainText(/当前行动英雄：\s*HIGHWAYMAN/);
  await expect(page.getByTestId("dungeon-gold")).toHaveText(
    `共享金币：${journey.game.dungeon!.gold}`,
  );
  await expect(
    page.getByRole("button", { name: "Intimidate：移出当天看守人", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  const spearStacks = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("ddbg.core-quest.save.v1")!).snapshot.dungeon.heroes[1]
        .statusStacks,
  );
  expect(spearStacks).toEqual([{ kind: "buff", remaining: 5 }]);
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByTestId("hamlet-event")).toContainText(/当前行动英雄：\s*HIGHWAYMAN/);
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("ddbg.core-quest.save.v1")!).snapshot.dungeon.heroes[1]
          .statusStacks,
    ),
  ).toEqual(spearStacks);
  await page.screenshot({ path: testInfo.outputPath("sharpen-spear-saved.png"), fullPage: true });
  // 真实第四天未封锁的游商；陈列待选/付款待选刷新，装备后仅扣一次4金。
  await page.evaluate(
    (save) => localStorage.setItem("ddbg.core-quest.save.v1", save),
    JSON.stringify(nomad.save),
  );
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await page.getByRole("button", { name: "访问游商马车I：陈列与购买饰品", exact: true }).click();
  const nomadDisplayText = async () =>
    (await page.getByTestId("nomad-display").innerText()).replace(/\s+/g, " ").trim();
  const display = await nomadDisplayText();
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  expect(await nomadDisplayText()).toBe(display);
  await page
    .getByRole("button", { name: /^购买 / })
    .first()
    .click();
  await expect(page.getByTestId("dungeon-gold")).toHaveText(
    `共享金币：${nomad.game.dungeon!.gold - 4}`,
  );
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await page.getByRole("button", { name: /^hero-0 装备 / }).click();
  await expect(page.getByTestId("hamlet-event")).toContainText(/当前行动英雄：\s*HELLION/);
  await expect(page.getByTestId("dungeon-gold")).toHaveText(
    `共享金币：${nomad.game.dungeon!.gold - 4}`,
  );
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  const held = await page.evaluate(
    () => JSON.parse(localStorage.getItem("ddbg.core-quest.save.v1")!).snapshot.dungeon.trinkets,
  );
  expect(held.display).toHaveLength(2);
  expect(held.held).toHaveLength(1);
  expect(held.held[0].heroId).toBe("hero-0");
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByTestId("dungeon-gold")).toHaveText(
    `共享金币：${nomad.game.dungeon!.gold - 4}`,
  );
  await page.screenshot({ path: testInfo.outputPath("nomad-purchase-saved.png"), fullPage: true });
  // 真实命令：Crusader首日购买并装备，另一天游商未封锁时再次来访出售。
  await page.evaluate(
    (save) => localStorage.setItem("ddbg.core-quest.save.v1", save),
    JSON.stringify(nomadSale.save),
  );
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await page.getByRole("button", { name: "访问游商马车I：陈列与购买饰品", exact: true }).click();
  const saleDisplay = await nomadDisplayText();
  await page.getByRole("button", { name: /^出售 / }).click();
  await expect(page.getByTestId("dungeon-gold")).toHaveText(
    `共享金币：${nomadSale.game.dungeon!.gold + 2}`,
  );
  await expect(page.getByRole("button", { name: /^出售 / })).toHaveCount(0);
  expect(await nomadDisplayText()).toBe(saleDisplay);
  await expect(page.getByTestId("hamlet-event")).toContainText(/当前行动英雄：\s*CRUSADER/);
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  const saleSnapshot = await page.evaluate(
    () => JSON.parse(localStorage.getItem("ddbg.core-quest.save.v1")!).snapshot.dungeon,
  );
  expect(saleSnapshot.trinkets.held).toEqual([]);
  expect(saleSnapshot.trinkets.deck).toContain(nomadSale.game.dungeon!.trinkets!.held[0]!.cardId);
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByTestId("dungeon-gold")).toHaveText(
    `共享金币：${nomadSale.game.dungeon!.gold + 2}`,
  );
  await expect(page.getByRole("button", { name: /^出售 / })).toHaveCount(0);
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("ddbg.core-quest.save.v1")!).snapshot.dungeon,
    ),
  ).toEqual(saleSnapshot);
  await page
    .getByRole("button", { name: /^购买 / })
    .first()
    .click();
  await page.getByRole("button", { name: /^hero-0 装备 / }).click();
  await expect(page.getByTestId("dungeon-gold")).toHaveText(
    `共享金币：${nomadSale.game.dungeon!.gold - 2}`,
  );
  await expect(page.getByTestId("hamlet-event")).toContainText(/当前行动英雄：\s*HELLION/);
  await page.screenshot({ path: testInfo.outputPath("nomad-sale-purchase.png"), fullPage: true });
  // 同一真实回村日志：购买铁匠I临时Smite II，刷新不重复付款，原I级技能保留。
  await page.evaluate(
    (save) => localStorage.setItem("ddbg.core-quest.save.v1", save),
    JSON.stringify(journey.save),
  );
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await page.getByRole("button", { name: "铁匠 I：Smite → II（1金）", exact: true }).click();
  await expect(page.getByTestId("blacksmith-plan")).toContainText("hero-0 Smite II");
  await expect(page.getByTestId("dungeon-gold")).toHaveText(
    `共享金币：${journey.game.dungeon!.gold - 1}`,
  );
  await expect(page.getByTestId("hamlet-event")).toContainText(/当前行动英雄：\s*HELLION/);
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  const smithHero = await page.evaluate(
    () => JSON.parse(localStorage.getItem("ddbg.core-quest.save.v1")!).snapshot.dungeon.heroes[0],
  );
  expect(smithHero.nextQuestSkillUpgrades).toEqual([
    { originalSkillId: "hero_skill:p001", temporarySkillId: "hero_skill:p002" },
  ]);
  expect(smithHero.skillIds).toContain("hero_skill:p001");
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByTestId("blacksmith-plan")).toContainText("hero-0 Smite II");
  await expect(page.getByTestId("dungeon-gold")).toHaveText(
    `共享金币：${journey.game.dungeon!.gold - 1}`,
  );
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("ddbg.core-quest.save.v1")!).snapshot.dungeon.heroes[0],
    ),
  ).toEqual(smithHero);
  await page.screenshot({ path: testInfo.outputPath("blacksmith-plan-saved.png"), fullPage: true });
  // seed11真实四房间Scout任务奖励2XP；公开恢复姿态，Guild待选、付款与完成均保存刷新。
  await page.evaluate(
    (save) => localStorage.setItem("ddbg.core-quest.save.v1", save),
    JSON.stringify(guild.save),
  );
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await page.getByRole("button", { name: "访问公会：永久升级英雄/技能", exact: true }).click();
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await page.getByRole("button", { name: "永久升级 Smite I→II（2 XP，1金）", exact: true }).click();
  await expect(page.getByTestId("dungeon-gold")).toHaveText(
    `共享金币：${guild.game.dungeon!.gold - 1}`,
  );
  await expect(page.getByTestId("guild-skills")).toContainText("hero-0 HL1 XP 0，永久移除1张");
  await expect(page.getByTestId("guild-skills")).toContainText("Smite 2");
  await expect(page.getByRole("button", { name: /^永久升级 / })).toHaveCount(0);
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByTestId("dungeon-gold")).toHaveText(
    `共享金币：${guild.game.dungeon!.gold - 1}`,
  );
  await page.getByRole("button", { name: "结束公会访问", exact: true }).click();
  await expect(page.getByTestId("hamlet-event")).toContainText(/当前行动英雄：\s*HELLION/);
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByTestId("guild-skills")).toContainText("Smite 2");
  await expect(page.getByTestId("hamlet-event")).toContainText(/当前行动英雄：\s*HELLION/);
  await page.screenshot({ path: testInfo.outputPath("guild-smite-saved.png"), fullPage: true });
  // 两任务自然4XP：升级英雄II时的待选、离开公会、补满四技能及刷新恢复。
  await page.evaluate(
    (save) => localStorage.setItem("ddbg.core-quest.save.v1", save),
    JSON.stringify(naturalGuild.save),
  );
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await page.getByRole("button", { name: "访问公会：永久升级英雄/技能", exact: true }).click();
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await page.getByRole("button", { name: "永久升级英雄 I→II（4 XP，2金）", exact: true }).click();
  await expect(page.getByTestId("guild-skills")).toContainText("hero-0 HL2 XP 0");
  await expect(page.getByTestId("dungeon-gold")).toHaveText(
    `共享金币：${naturalGuild.game.dungeon!.gold - 2}`,
  );
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await page.getByRole("button", { name: "结束公会访问", exact: true }).click();
  await page.getByTestId("set-skills-hero-0").click();
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  const levelTwo = await page.evaluate(
    () => JSON.parse(localStorage.getItem("ddbg.core-quest.save.v1")!).snapshot.dungeon,
  );
  expect(levelTwo.heroes[0]).toMatchObject({
    heroStatId: "hero_stat:p001:back",
    level: 2,
    life: 24,
    xp: 0,
  });
  expect(levelTwo.heroes[0].skillIds).toHaveLength(4);
  expect(levelTwo.stagecoachXp).toBe(4);
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByTestId("guild-skills")).toContainText("hero-0 HL2 XP 0");
  await expect(page.getByTestId("hamlet-event")).toContainText(/当前行动英雄：\s*HELLION/);
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("ddbg.core-quest.save.v1")!).snapshot.dungeon,
    ),
  ).toEqual(levelTwo);
  await page.screenshot({ path: testInfo.outputPath("guild-hero-ii-saved.png"), fullPage: true });
  // 同一条村庄冒烟：真实金币升级游商III，跨等级陈列/付款待选保存刷新。
  await page.evaluate(
    (save) => localStorage.setItem("ddbg.core-quest.save.v1", save),
    JSON.stringify(higherNomadSave),
  );
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await page.getByRole("button", { name: "访问游商马车III：陈列与购买饰品", exact: true }).click();
  await expect(page.getByTestId("nomad-display")).toContainText(" III");
  await expect(page.getByTestId("nomad-display")).toContainText(" II");
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByTestId("nomad-display")).toContainText(" III");
  const purchase = page.getByRole("button", { name: /^购买 / }).last();
  const price = Number((await purchase.innerText()).match(/（(\d+) 金）/)![1]);
  await purchase.click();
  await expect(page.getByTestId("dungeon-gold")).toHaveText(
    `共享金币：${higherNomad.game.dungeon!.gold - price}`,
  );
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await page.getByRole("button", { name: /^hero-0 装备 / }).click();
  await expect(page.getByTestId("dungeon-gold")).toHaveText(
    `共享金币：${higherNomad.game.dungeon!.gold - price}`,
  );
  await expect(page.getByTestId("hamlet-event")).toContainText(/当前行动英雄：\s*HELLION/);
  await page.screenshot({ path: testInfo.outputPath("nomad-iii-saved.png"), fullPage: true });
  // 旧五英雄的候选待选存档：迁移后出现瘟疫医生/盗墓者/神秘学者，选择/技能/入队可保存刷新。
  await page.evaluate(
    (save) => localStorage.setItem("ddbg.core-quest.save.v1", save),
    JSON.stringify(replacementSave),
  );
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByRole("button", { name: /^选择 BOUNTY HUNTER I/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^选择 PLAGUE DOCTOR I/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^选择 GRAVE ROBBER I/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^选择 OCCULTIST I/ })).toBeVisible();
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await page.getByRole("button", { name: /^选择 PLAGUE DOCTOR I/ }).click();
  await page.getByRole("button", { name: "结束升级，选择初始技能", exact: true }).click();
  await page.getByRole("button", { name: "装备 Noxious Blast 1", exact: true }).click();
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await page.getByRole("button", { name: "装备 Plague Grenade 1", exact: true }).click();
  await page.getByRole("button", { name: "装备 Blinding Gas 1", exact: true }).click();
  await page.getByRole("button", { name: "让1名替补入队并继续", exact: true }).click();
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  const joined = await page.evaluate(
    () => JSON.parse(localStorage.getItem("ddbg.core-quest.save.v1")!).snapshot.dungeon,
  );
  expect(joined.heroes).toHaveLength(4);
  expect(
    joined.heroes.some(
      (h: { heroStatId: string; dead?: boolean }) =>
        h.heroStatId === "hero_stat:p013:front" && !h.dead,
    ),
  ).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("ddbg.core-quest.save.v1")!).snapshot.dungeon,
    ),
  ).toEqual(joined);
});
