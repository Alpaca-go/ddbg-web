import type { ApplyResult, GameState } from "./command";
import { rejectBattleCommand } from "./battle";
import { currentHamletHero, finishHamletAction } from "./hamlet-actions";
import { buildingLevelsProblem, recoveryBuildingLevel } from "./hamlet-buildings";

export type BlacksmithCommand = {
  readonly type: "visitBlacksmith";
  readonly actorId: string;
  readonly skillId: string;
};
function options(state: GameState) {
  const d = state.dungeon,
    hero = currentHamletHero(state);
  if (!d || !hero || !d.battleCatalog || buildingLevelsProblem(d)) return [];
  const stat = d.battleCatalog.heroStats.find((c) => c.id === hero.heroStatId);
  if (
    !hero.attributesVerified ||
    !stat?.attributesVerified ||
    stat.level !== 1 ||
    hero.level !== 1 ||
    (hero.heroLevel !== undefined && hero.heroLevel !== hero.level) ||
    !Array.isArray(hero.skillIds) ||
    new Set(hero.skillIds).size !== hero.skillIds.length
  )
    return [];
  const level = recoveryBuildingLevel(d, "blacksmith") === 1 ? 2 : 3;
  return (hero.skillIds ?? []).flatMap((id) => {
    const original = d.battleCatalog!.skills.find((c) => c.id === id);
    const upgraded = d.battleCatalog!.skills.filter(
      (c) =>
        c.hero === stat.name &&
        c.name === original?.name &&
        c.level === level &&
        !c.verification.unverified,
    );
    if (
      !original ||
      !original.name ||
      original.hero !== stat.name ||
      original.level !== 1 ||
      original.verification.unverified ||
      upgraded.length !== 1
    )
      return [];
    return [{ original, upgraded: upgraded[0]! }];
  });
}
/** R34：仅提供已装备、已核实技能的临时升级；其余拥有技能待装备管理接入。 */
export function blacksmithOptions(state: GameState) {
  const actor = currentHamletHero(state),
    d = state.dungeon;
  if (!actor || !d || d.pending || state.battle || d.phase !== "inHamlet" || d.hamlet?.active)
    return [];
  const level = recoveryBuildingLevel(d, "blacksmith");
  return options(state).map(({ original, upgraded }) => ({
    label: `铁匠 ${["I", "II", "III"][level - 1]}：${original.name} → ${upgraded.level === 2 ? "II" : "III"}（1金${level === 3 ? "，奖励补给骰+1" : ""}）`,
    command: {
      type: "visitBlacksmith",
      actorId: actor.id,
      skillId: original.id,
    } as BlacksmithCommand,
  }));
}
/** R33/34、R-041：付款/占用/下一任务记录原子提交，不更换本次任务技能或提前掷骰。 */
export function visitBlacksmith(state: GameState, command: BlacksmithCommand): ApplyResult {
  const d = state.dungeon,
    h = d?.hamlet,
    hero = currentHamletHero(state);
  if (
    !d ||
    state.battle ||
    d.phase !== "inHamlet" ||
    d.hamletReturn?.phase !== "complete" ||
    d.pending ||
    h?.phase !== "heroActions" ||
    h.active ||
    !hero ||
    hero.id !== command.actorId ||
    d.heroes.length !== 4 ||
    d.heroes.some(
      (a) => a.dead || !Number.isSafeInteger(a.stress) || a.stress < 0 || a.stress > 9,
    ) ||
    !h.preparationDays ||
    (h.remainingDays ?? h.preparationDays) < 1 ||
    !Number.isSafeInteger(d.gold) ||
    d.gold < 1 ||
    buildingLevelsProblem(d) ||
    h.blockedBuildings.includes("blacksmith") ||
    h.visitedBuildings?.includes("blacksmith")
  )
    return rejectBattleCommand(state, "请按村庄当天顺序访问未封锁/占用的铁匠，需1金（R33/34）");
  const selected = options(state).find(({ original }) => original.id === command.skillId);
  const prior = hero.nextQuestSkillUpgrades === undefined ? [] : hero.nextQuestSkillUpgrades;
  if (
    !Array.isArray(prior) ||
    prior.some(
      (u) =>
        !u ||
        !options(state).some(({ original }) => original.id === u.originalSkillId) ||
        !d.battleCatalog!.skills.some(
          (c) =>
            c.id === u.temporarySkillId &&
            c.name === d.battleCatalog!.skills.find((c) => c.id === u.originalSkillId)?.name &&
            c.hero === d.battleCatalog!.heroStats.find((c) => c.id === hero.heroStatId)?.name &&
            [2, 3].includes(c.level) &&
            !c.verification.unverified,
        ),
    ) ||
    new Set(prior.map((u) => u.originalSkillId)).size !== prior.length ||
    !selected
  )
    return rejectBattleCommand(
      state,
      "铁匠需要有效的已装备I级原卡与已核实高等级卡，未付款（R-048）",
    );
  const level = recoveryBuildingLevel(d, "blacksmith"),
    previousDice = hero.nextQuestProvisionDice === undefined ? 0 : hero.nextQuestProvisionDice;
  if (
    level === 3 &&
    (!Number.isSafeInteger(previousDice) ||
      previousDice < 0 ||
      !Number.isSafeInteger(previousDice + 1))
  )
    return rejectBattleCommand(state, "下次任务奖励补给骰数量无效，未付款或消耗行动（R-041）");
  const updated = {
    ...hero,
    nextQuestSkillUpgrades: [
      ...prior.filter((u) => u.originalSkillId !== command.skillId),
      { originalSkillId: selected.original.id, temporarySkillId: selected.upgraded.id },
    ],
    ...(level === 3 ? { nextQuestProvisionDice: previousDice + 1 } : {}),
  };
  const next = {
    ...d,
    gold: d.gold - 1,
    heroes: d.heroes.map((a) => (a.id === hero.id ? updated : a)),
    hamlet: { ...h, visitedBuildings: [...(h.visitedBuildings ?? []), "blacksmith"] },
  };
  return {
    state: { ...state, dungeon: finishHamletAction(next, hero.id, false) },
    events: [
      {
        type: "dungeonUpdated",
        message: `${hero.id}支付1金：${selected.original.name}下次任务按${selected.upgraded.level}级使用${level === 3 ? "，奖励补给骰+1" : ""}；原卡保留，实际出征/任务结束还原等待任务循环接入（R34）`,
      },
    ],
  };
}
