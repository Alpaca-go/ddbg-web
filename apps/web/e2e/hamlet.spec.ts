import { expect, test } from "@playwright/test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { naturalAbbeyQuest } from "../../../packages/engine/src/test-helpers/abbey-quest";
import type { ApplyResult } from "../../../packages/engine/src/command";
import type { QuestSave } from "../../../packages/data/src/quest-save";
import type { caregiversQuest } from "../../../packages/engine/src/test-helpers/caregivers-quest";

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
});
