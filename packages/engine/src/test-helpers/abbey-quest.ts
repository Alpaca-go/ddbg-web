import { applyCommand } from "../command";
import type { Command } from "../command";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { createQuestSave } from "../quest-save";
import { coreQuestSources } from "./core-quest";
import { naturalParty, naturalQuest } from "./natural-quest";

export const NATURAL_ABBEY_SEED = 123;

/** 共用公开命令路径；建筑可用性按各自然场景的目标单独验证。 */
function naturalHamletQuest(
  catalog: typeof coreQuestSources.catalog,
  seed: number,
  building: "abbey" | "graveyard",
) {
  const sources = { ...coreQuestSources, catalog };
  const journey = naturalQuest(seed, "quest:p003", false, sources);
  const donation = journey.commands.at(-1);
  if (donation?.type !== "resolveChoice" || !donation.choiceId.startsWith("dungeon-fundraiser:"))
    throw new Error("修道院自然场景未到达 Fundraiser 捐献选择，不能替换末条命令");
  const commands: Command[] = [
    ...journey.commands.slice(0, -1),
    { ...donation, optionId: "give:0" },
  ];
  const start = {
    seed,
    questId: "quest:p003" as const,
    mode: "radiant" as const,
    party: naturalParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
  };
  let game = createCoreDungeonQuest(seed, start.questId, start.mode, naturalParty, sources);
  const apply = (c: Command) => {
    const r = applyCommand(game, c);
    const refused = r.events.find((e) => e.type === "commandRefused");
    if (refused) throw new Error(`${c.type}: ${refused.message}`);
    game = r.state;
    return r;
  };
  for (const c of commands) apply(c);
  const step = (c: Command) => {
    commands.push(c);
    return apply(c);
  };
  let r = step({ type: "beginReturnToHamlet" });
  while (r.pendingChoice)
    r = step({
      type: "resolveChoice",
      choiceId: r.pendingChoice.id,
      optionId: r.pendingChoice.options[0]!.id,
    });
  step({ type: "finishReturnToHamlet" });
  // 战斗可能改变姿态；按 R-093 用公开命令恢复场景需要的当天行动顺序。
  step({ type: "setHamletStances", heroIds: ["hero-0", "hero-1", "hero-2", "hero-3"] });
  step({ type: "upgradeHamletBuilding", building: "abbey" });
  step({ type: "drawHamletEvent" });
  step({ type: "rollHamletCaretaker" });
  const d = game.dungeon!,
    h = d.hamlet!;
  if (
    h.last !== "hamlet_event:p013" ||
    h.preparationDays !== 4 ||
    h.day !== 1 ||
    h.phase !== "heroActions" ||
    h.heroOrder.length !== 4 ||
    h.heroOrder.some((id, i) => id !== `hero-${i}`) ||
    d.pending ||
    h.blockedBuildings.includes(building) ||
    d.gold < 3 ||
    d.heroes.some((hero) => hero.dead)
  )
    throw new Error(
      `自然村庄场景前置漂移（seed ${seed}，${building}）：需要四天 General Repairs 首日、目标建筑可用、四名存活英雄和服务费用`,
    );
  return { game, commands, start, save: createQuestSave(start, commands, game, sources) };
}

/** 真实 Fundraiser → General Repairs 首日修道院可用，不搜索 / 注入资源或牌序。 */
export function naturalAbbeyQuest(catalog = coreQuestSources.catalog, seed = NATURAL_ABBEY_SEED) {
  return naturalHamletQuest(catalog, seed, "abbey");
}

/** 墓地有独立可用性前置，不能复用首日墓地被封锁的 seed123。 */
export function naturalGraveyardQuest(catalog = coreQuestSources.catalog) {
  return naturalHamletQuest(catalog, 3, "graveyard");
}
