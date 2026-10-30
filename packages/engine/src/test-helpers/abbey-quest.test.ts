import { expect, it } from "vitest";
import { battleDataPlugin } from "../../../../apps/web/battle-data-plugin";
import { NATURAL_ABBEY_SEED, naturalAbbeyQuest, naturalGraveyardQuest } from "./abbey-quest";
import { coreQuestSources } from "./core-quest";
import { applyCommand } from "../command";
import { createQuestSave, loadQuestSave } from "../quest-save";

it("固定种子以完整公开命令到达修道院前置，存档与首次服务结果可往返", () => {
  const before = structuredClone(coreQuestSources);
  const journey = naturalAbbeyQuest();
  const d = journey.game.dungeon!;
  expect(journey.start.seed).toBe(NATURAL_ABBEY_SEED);
  expect(d).toMatchObject({
    phase: "inHamlet",
    gold: 33,
    buildingLevels: { abbey: 2 },
    questSummary: { questId: "quest:p003", donatedGold: 0, xpPerHero: 0, awarded: true },
    hamlet: {
      last: "hamlet_event:p013",
      preparationDays: 4,
      day: 1,
      phase: "heroActions",
      heroOrder: ["hero-0", "hero-1", "hero-2", "hero-3"],
    },
  });
  expect(d.hamlet!.remainingDays ?? d.hamlet!.preparationDays).toBe(4);
  expect(d.hamlet!.actedHeroes ?? []).toEqual([]);
  expect(d.hamlet!.visitedBuildings ?? []).toEqual([]);
  expect(d.heroes.every((hero) => !hero.dead)).toBe(true);
  expect(d.hamlet!.blockedBuildings).toEqual(["sanitarium", "graveyard"]);
  expect(loadQuestSave(JSON.parse(JSON.stringify(journey.save)), coreQuestSources).game).toEqual(
    journey.game,
  );
  const visit = {
    type: "visitHamletBuilding",
    actorId: "hero-0",
    serviceId: "abbeyPositiveQuirk",
    quirkIds: [],
  } as const;
  const result = applyCommand(journey.game, visit);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(result.pendingChoice).toBeUndefined();
  expect(result.state.dungeon!.heroes[0]!.quirkIds).toHaveLength(1);
  expect(result.state.dungeon!.gold).toBe(30);
  const saved = createQuestSave(
    journey.start,
    [...journey.commands, visit],
    result.state,
    coreQuestSources,
  );
  expect(loadQuestSave(JSON.parse(JSON.stringify(saved)), coreQuestSources).game).toEqual(
    result.state,
  );
  expect(coreQuestSources).toEqual(before);
}, 20000);

it("修道院 / 墓地前置各自验证，不能把建筑封锁的场景当作可用基准", () => {
  const graveyard = naturalGraveyardQuest();
  expect(graveyard.start.seed).toBe(3);
  expect(graveyard.game.dungeon!.hamlet!.blockedBuildings).toContain("abbey");
  expect(graveyard.game.dungeon!.hamlet!.blockedBuildings).not.toContain("graveyard");
  expect(() => naturalAbbeyQuest(coreQuestSources.catalog, 3)).toThrow(/自然村庄场景前置漂移/);
}, 20000);

it("正式网页目录也可到达同一自然修道院起点并载入正式存档", () => {
  const load = battleDataPlugin().load as (id: string) => string;
  const code = load("\0virtual:quest-battle-data");
  const catalog = {
    ...JSON.parse(code.slice("export const battleData = ".length, -1)),
    trinkets: coreQuestSources.catalog.trinkets,
  };
  const journey = naturalAbbeyQuest(catalog);
  expect(journey.game.dungeon!.hamlet!.blockedBuildings).not.toContain("abbey");
  expect(
    loadQuestSave(JSON.parse(JSON.stringify(journey.save)), { ...coreQuestSources, catalog }).game,
  ).toEqual(journey.game);
}, 20000);
