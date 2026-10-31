import { expect, it } from "vitest";
import { battleDataPlugin } from "../../../../apps/web/battle-data-plugin";
import { coreQuestSources } from "./core-quest";
import { nomadQuest } from "./nomad-quest";
import { nomadSaleQuest } from "./nomad-sale-quest";
import { nomadUpgradeQuest } from "./nomad-upgrade-quest";
import { createQuestSave, loadQuestSave } from "../quest-save";

it("正式网页目录的首次来访、再次出售与III级游商均由公开日志到达并可载入", () => {
  const load = battleDataPlugin().load as (id: string) => string;
  const code = load("\0virtual:quest-battle-data");
  const catalog = {
    ...JSON.parse(code.slice("export const battleData = ".length, -1)),
    trinkets: coreQuestSources.catalog.trinkets,
  };
  const sources = { ...coreQuestSources, catalog };
  const first = nomadQuest(catalog),
    sale = nomadSaleQuest(catalog),
    higher = nomadUpgradeQuest(3, catalog);
  expect(first.start.seed).toBe(68);
  expect(first.game.dungeon!.hamlet!.day).toBe(4);
  expect(first.game.dungeon!.trinkets!.display).toBeUndefined();
  expect(sale.game.dungeon!.hamlet!.day).toBeGreaterThan(1);
  expect(sale.game.dungeon!.trinkets!.held.length).toBeGreaterThanOrEqual(1);
  expect(higher.game.dungeon!.buildingLevels?.nomadWagon).toBe(3);
  expect(higher.game.dungeon!.buildingLevels?.abbey).toBeUndefined();
  for (const journey of [first, sale, higher]) {
    expect(journey.game.dungeon!.hamlet!.blockedBuildings).not.toContain("nomadWagon");
    const save = createQuestSave(journey.start, journey.commands, journey.game, sources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(journey.game);
  }
}, 30000);
