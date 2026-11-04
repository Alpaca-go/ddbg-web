import type { GameState } from "../command";
import { applyCommand } from "../command";
import { finalPreparationFixture } from "./final-preparation";

const PARTY_NAMES = ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"] as const;

/**
 * 战役末期的 III 级队伍夹具：四名英雄全技能升到 III（`permanentlyRemovedSkillIds` 记录 I/II 阶被替换）、
 * 装备 5 张技能（R-051：2 + HL）。
 *
 * 说明：自然任务夹具固定 I 级队伍，打不过最终战三形态（实测 heroesDefeated）；
 * 本条夹具用于「四形态真实战斗」验收，不代表战役等级成长流程已模拟。
 */
export function levelThreeEndgameParty(game: GameState): GameState {
  const d = game.dungeon!;
  const catalog = d.battleCatalog!;
  const heroes = d.heroes.map((hero, index) => {
    const name = PARTY_NAMES[index]!;
    const stat = catalog.heroStats.find(
      (entry) => entry.name === name && entry.level === 3 && entry.id.endsWith(":front"),
    )!;
    const cards = catalog.skills.filter(
      (skill) => skill.hero === name && !skill.verification.unverified,
    );
    const names = [...new Set(cards.map((skill) => skill.name!))];
    const permanentlyRemovedSkillIds: string[] = [];
    const level3Ids: string[] = [];
    for (const skillName of names) {
      for (const level of [1, 2] as const) {
        const card = cards.find((entry) => entry.name === skillName && entry.level === level);
        if (card) permanentlyRemovedSkillIds.push(card.id);
      }
      const top = cards.find((entry) => entry.name === skillName && entry.level === 3);
      if (top) level3Ids.push(top.id);
    }
    return {
      ...hero,
      heroStatId: stat.id,
      level: 3,
      life: stat.life,
      wounds: 0,
      stress: 0,
      dead: false,
      skillIds: level3Ids.slice(0, 5),
      permanentlyRemovedSkillIds,
    };
  });
  return { ...game, dungeon: { ...d, heroes } };
}

/** 最终准备完成 + 补给就绪 + 形态流程已建立（`awaitingDeployment`），等待部署首形态。 */
export function endgameFinalBattleReady(
  questId: "quest:p016" | "quest:p017" | "quest:p018" = "quest:p016",
): GameState {
  const base = levelThreeEndgameParty(finalPreparationFixture(questId));
  const begun = applyCommand(base, { type: "beginFinalPreparation" }).state;
  const state: GameState = {
    ...begun,
    dungeon: {
      ...begun.dungeon!,
      finalBattleProvisions: "ready",
      hamlet: {
        ...begun.dungeon!.hamlet!,
        phase: "preparationComplete",
        remainingDays: 0,
        day: 4,
      },
    },
  };
  return applyCommand(state, { type: "prepareFinalBattleForms" }).state;
}
