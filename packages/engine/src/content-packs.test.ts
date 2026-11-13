import { beforeEach, expect, it } from "vitest";
import { sourcesForContentPacks } from "./content-packs";
import { createCampaignQuest } from "./campaign-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { applyCommand } from "./command";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { clearBossScriptsForTest, listBossScripts } from "./boss/registry";
import { ensureCoreBossScriptsRegistered } from "./boss/ensure-core-boss-scripts";
import { ensureCampaignBossScriptsRegistered } from "./expansions/register";
import { setActiveBossThreat } from "./boss/set-active-boss-threat";
import { readActiveBossThreatScript } from "./boss/threat-passive-runtime";
import type { ContentPackId } from "./content-packs";
import { replacementHeroCandidates } from "./hero-death-estate";
import { skillBelongsToFormalHero } from "./formal-roster-catalog";
import { naturalHamletStart } from "./test-helpers/guild-quest";
import { cardContentPack } from "../../data/src/content-packs";
import { resolveScriptIdForDescriptionCard } from "./boss/threat-description-catalog";
import { HAG_I_DESCRIPTION_ABILITY_CARD_ID } from "./expansions/weald/boss/hag-i";

beforeEach(clearBossScriptsForTest);
const start = {
  seed: 2,
  questId: "quest:p001" as const,
  mode: "radiant" as const,
  party: coreParty.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
  bossEdgeRooms: true,
};
const campaign = (packs: readonly ContentPackId[] = ["core"]) =>
  createCampaignQuest(start.seed, start.questId, start.mode, start.party, coreQuestSources, packs);

it("核心注册入口不再注册任何扩展 Boss", () => {
  ensureCoreBossScriptsRegistered();
  expect(listBossScripts().length).toBeGreaterThan(0);
  expect(listBossScripts().every((s) => /^boss:(ruins|darkest):/.test(s.id))).toBe(true);
  expect(
    resolveScriptIdForDescriptionCard(HAG_I_DESCRIPTION_ABILITY_CARD_ID, ["core"]),
  ).toBeUndefined();
  expect(
    resolveScriptIdForDescriptionCard(HAG_I_DESCRIPTION_ABILITY_CARD_ID, ["core", "weald"]),
  ).toBe("boss:weald:hag:1");
  expect(() => cardContentPack({ id: "monster:unregistered:001" })).toThrow("未登记");
});

it("每个扩展独立启用，并允许多选；注册缓存不改变另一战役的权限", () => {
  const scripts = [
    ["weald", "boss:weald:hag:1"],
    ["warrens", "boss:warrens:swine_prince:1"],
    ["warrens", "boss:warrens:flesh:1"],
    ["cove", "boss:cove:siren:1"],
  ] as const;
  for (const pack of ["weald", "warrens", "cove"] as const) {
    clearBossScriptsForTest();
    ensureCampaignBossScriptsRegistered(["core", pack]);
    for (const [owner, scriptId] of scripts)
      expect(listBossScripts().some((s) => s.id === scriptId)).toBe(owner === pack);
  }
  ensureCampaignBossScriptsRegistered(["core", "weald", "warrens", "cove"]);
  for (const [owner, scriptId] of scripts) {
    const core = campaign();
    const denied = setActiveBossThreat(core, { type: "setActiveBossThreat", scriptId });
    expect(denied.state).toBe(core);
    expect(denied.events[0]?.type).toBe("commandRefused");
    const enabled = campaign(["core", owner]);
    const result = setActiveBossThreat(enabled, { type: "setActiveBossThreat", scriptId });
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    expect(readActiveBossThreatScript(result.state.dungeon!)?.id).toBe(scriptId);
    const invalid = { ...core, dungeon: { ...core.dungeon!, activeBossThreatScriptId: scriptId } };
    expect(readActiveBossThreatScript(invalid.dungeon)).toBeUndefined();
    expect(applyCommand(invalid, { type: "ping", message: "probe" }).events[0]?.type).toBe(
      "commandRefused",
    );
  }
});

it("核心包单独启用时，十八名英雄及全部等级技能仍可开局和替补", () => {
  const source = sourcesForContentPacks(coreQuestSources, ["core"]);
  expect(source.catalog.heroStats).toEqual(coreQuestSources.catalog.heroStats);
  expect(source.catalog.skills).toEqual(coreQuestSources.catalog.skills);
  const all = source.catalog.heroStats.filter((s) => s.level === 1);
  expect(all).toHaveLength(18);
  for (const stat of all) {
    const heroes = [stat, ...all.filter((s) => s.name !== stat.name)].slice(0, 4);
    const party = heroes.map((s, index) => ({
      heroStatId: s.id,
      stance: coreParty[index]!.stance,
      skillIds: source.catalog.skills
        .filter((c) => c.level === 1 && skillBelongsToFormalHero(s.name, c))
        .slice(0, 3)
        .map((c) => c.id),
    }));
    expect(
      createCampaignQuest(2, "quest:p001", "radiant", party, coreQuestSources).dungeon?.heroes,
    ).toHaveLength(4);
  }
  const game = campaign();
  expect(replacementHeroCandidates(game.dungeon!)).toHaveLength(14);
});

it("所有非英雄来源在建池前按包过滤，同包条目保序；不修改输入", () => {
  const base = coreQuestSources;
  const marked = <T extends { readonly id: string }>(cards: readonly T[]) => [
    cards[0]!,
    ...(["weald", "warrens", "cove"] as const).map((p) => ({ ...cards[0]!, id: `probe:${p}:001` })),
  ];
  const sources = {
    ...base,
    catalog: {
      ...base.catalog,
      monsters: marked(base.catalog.monsters),
      conditions: {
        ...base.catalog.conditions!,
        diseases: marked(base.catalog.conditions!.diseases),
        quirks: marked(base.catalog.conditions!.quirks),
      },
      trinkets: { ...base.catalog.trinkets!, cards: marked(base.catalog.trinkets!.cards) },
    },
    monsters: marked(base.monsters),
    rooms: marked(base.rooms),
    curios: marked(base.curios),
    resolveCards: marked(base.resolveCards),
  };
  const original = JSON.stringify(sources);
  const filtered = sourcesForContentPacks(sources, ["core", "weald", "cove"]);
  const lists = [
    filtered.catalog.monsters,
    filtered.monsters,
    filtered.rooms,
    filtered.curios,
    filtered.resolveCards,
    filtered.catalog.conditions!.diseases,
    filtered.catalog.conditions!.quirks,
    filtered.catalog.trinkets!.cards,
  ];
  for (const list of lists) {
    expect(list.map((c) => c.id).slice(1)).toEqual(["probe:weald:001", "probe:cove:001"]);
    expect(list).toHaveLength(3);
  }
  expect(JSON.stringify(sources)).toBe(original);
});

it("包选择随命令重放及存档恢复，篡改选择/快照均拒绝；旧档保留原行为", () => {
  const game = campaign(["core", "cove", "weald"]);
  const command = { type: "establishImminentThreat" } as const;
  const result = applyCommand(game, command);
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
  const saved = createQuestSave(start, [command], result.state, coreQuestSources);
  expect(saved.start.contentPacks).toEqual(["core", "weald", "cove"]);
  expect(loadQuestSave(saved, coreQuestSources).game).toEqual(result.state);
  const changed = structuredClone(saved);
  changed.start.contentPacks = ["core"];
  expect(() => loadQuestSave(changed, coreQuestSources)).toThrow();
  const stripped = structuredClone(saved);
  delete stripped.start.contentPacks;
  expect(() => loadQuestSave(stripped, coreQuestSources)).toThrow();
  const legacy = createCoreDungeonQuest(
    2,
    start.questId,
    start.mode,
    start.party,
    coreQuestSources,
  );
  const oldSave = createQuestSave(start, [], legacy, coreQuestSources);
  expect(oldSave.start.contentPacks).toBeUndefined();
  expect(loadQuestSave(oldSave, coreQuestSources).game).toEqual(legacy);
  expect(() => campaign([])).toThrow();
  expect(() => campaign(["core", "core"])).toThrow();
  expect(() => campaign(["weald"])).toThrow();
});

it("回村再出征保留包选择和共享英雄目录", () => {
  const prefix = naturalHamletStart(coreQuestSources, 6);
  const d = prefix.game.dungeon!;
  // 明示准备结束夹具，只收束村庄天数，不改变 RNG、英雄或持牌。
  const contentPacks = ["core", "weald", "cove"] as const;
  const state = {
    ...prefix.game,
    dungeon: {
      ...d,
      contentPacks,
      pending: null,
      hamlet: {
        ...d.hamlet!,
        phase: "preparationComplete" as const,
        remainingDays: 0,
        actedHeroes: [],
        visitedBuildings: [],
        heroOrder: [],
        caretaker: null,
        blockedBuildings: d.hamlet!.weekBlockedBuildings ?? [],
        active: null,
      },
    },
  };
  let offered = applyCommand(state, { type: "offerNextQuest" });
  expect(offered.events.some((e) => e.type === "commandRefused")).toBe(false);
  while (offered.state.dungeon!.pending?.id.startsWith("hamlet-quest-draw:")) {
    const draw = offered.state.dungeon!.pending!;
    expect(draw.options.every((o) => !o.id.includes("cove"))).toBe(true);
    offered = applyCommand(offered.state, {
      type: "resolveChoice",
      choiceId: draw.id,
      optionId: draw.options[0]!.id,
    });
    expect(offered.events.some((e) => e.type === "commandRefused")).toBe(false);
  }
  const choice = offered.state.dungeon!.pending!;
  const embarked = applyCommand(offered.state, {
    type: "resolveChoice",
    choiceId: choice.id,
    optionId: choice.options[0]!.id,
  });
  expect(embarked.events.some((e) => e.type === "commandRefused")).toBe(false);
  expect(embarked.state.dungeon!.contentPacks).toEqual(contentPacks);
  expect(embarked.state.dungeon!.battleCatalog!.heroStats).toEqual(d.battleCatalog!.heroStats);
});
