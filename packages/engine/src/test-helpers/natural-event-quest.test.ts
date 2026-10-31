import { expect, it } from "vitest";
import { battleDataPlugin } from "../../../../apps/web/battle-data-plugin";
import { coreQuestSources } from "./core-quest";
import { townFairQuest } from "./town-fair-quest";
import { caregiversQuest } from "./caregivers-quest";
import { paidUpgradeQuest } from "./natural-scout-return";
import { applyCommand } from "../command";
import type { Command } from "../command";
import { createQuestSave, loadQuestSave } from "../quest-save";

it("正式网页目录的事件 / 资金前置各自成立，事件和升级前后均可按公开日志载入", () => {
  const load = battleDataPlugin().load as (id: string) => string;
  const code = load("\0virtual:quest-battle-data");
  const catalog = {
    ...JSON.parse(code.slice("export const battleData = ".length, -1)),
    trinkets: coreQuestSources.catalog.trinkets,
  };
  const sources = { ...coreQuestSources, catalog };
  const fair = townFairQuest(sources),
    caregivers = caregiversQuest(sources),
    funded = paidUpgradeQuest(sources);
  expect(fair.start.seed).toBe(40);
  expect(fair.game.dungeon!.gold).toBe(39);
  expect(fair.game.dungeon!.hamlet).toBeUndefined();
  expect(caregivers.game.dungeon!.hamlet!.active).toBe("hamlet_event:p012");
  expect(caregivers.game.dungeon!.pending!.actorId).toBe("hero-0");
  expect(funded.start.seed).toBe(6);
  expect(funded.game.dungeon!.gold).toBe(50);
  const cases = [
    { journey: fair, command: { type: "drawHamletEvent" } as Command },
    {
      journey: caregivers,
      command: {
        type: "resolveChoice",
        choiceId: caregivers.game.dungeon!.pending!.id,
        optionId: "quirk:p030",
      } as Command,
    },
    {
      journey: funded,
      command: { type: "upgradeHamletBuilding", building: "stagecoach" } as Command,
    },
  ];
  for (const { journey, command } of cases) {
    expect(loadQuestSave(JSON.parse(JSON.stringify(journey.save)), sources).game).toEqual(
      journey.game,
    );
    const result = applyCommand(journey.game, command);
    expect(result.events.filter((event) => event.type === "commandRefused")).toEqual([]);
    const save = createQuestSave(
      journey.start,
      [...journey.commands, command],
      result.state,
      sources,
    );
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(result.state);
  }
}, 30000);
