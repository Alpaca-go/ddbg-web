import type { ApplyResult, GameState } from "./command";
import { rejectBattleCommand } from "./battle";
import { DUNGEON_HERO_STANCES } from "./dungeon-stances";

export type SetHamletStancesCommand = {
  readonly type: "setHamletStances";
  readonly heroIds: readonly string[];
};

/** R32–33、R-093：协商只改变剩余顺序，不退还已经花掉的行动。 */
export function canSetHamletStances(state: GameState): boolean {
  const d = state.dungeon,
    h = d?.hamlet;
  return !!(
    d &&
    !state.battle &&
    d.phase === "inHamlet" &&
    d.hamletReturn?.phase === "complete" &&
    d.questSummary?.awarded &&
    !d.pending &&
    !d.hamletStanceProposal &&
    !d.deathTrinketChoice &&
    !d.replacementPreparation &&
    !d.preparedReplacements?.length &&
    !d.replacementResume &&
    !d.campaignFailure &&
    !d.conditions?.incomingQuirk &&
    !d.trinkets?.incoming &&
    !d.curio?.active &&
    !d.pendingCurioDraw &&
    !d.roomCards?.active &&
    !d.monsterPool?.active &&
    (!h ||
      (!h.active &&
        ["awaitingCaretaker", "heroActions", "preparationComplete"].includes(h.phase))) &&
    d.heroes.length === 4 &&
    new Set(d.heroes.map((x) => x.id)).size === 4 &&
    new Set(d.heroes.map((x) => x.stance)).size === 4 &&
    d.heroes.every(
      (x) =>
        !!x.id &&
        !x.dead &&
        !x.combat?.dead &&
        Number.isSafeInteger(x.stress) &&
        x.stress >= 0 &&
        x.stress < 10 &&
        DUNGEON_HERO_STANCES.includes(x.stance!),
    ) &&
    (h?.phase !== "heroActions" ||
      (h.heroOrder.length === 4 &&
        new Set(h.heroOrder).size === 4 &&
        new Set(h.actedHeroes ?? []).size === (h.actedHeroes?.length ?? 0) &&
        (h.actedHeroes?.length ?? 0) < 4 &&
        (h.actedHeroes ?? []).every((id) => h.heroOrder.includes(id)) &&
        h.heroOrder
          .filter((id) => !h.actedHeroes?.includes(id))
          .every((id) => d.heroes.some((x) => x.id === id))))
  );
}

function validOrder(state: GameState, ids: readonly string[]): boolean {
  return (
    Array.isArray(ids) &&
    ids.length === 4 &&
    new Set(ids).size === 4 &&
    ids.every((id) => state.dungeon!.heroes.some((h) => h.id === id))
  );
}
function applyOrder(state: GameState, ids: readonly string[], reorder: boolean): ApplyResult {
  const d = state.dungeon!,
    h = d.hamlet;
  const heroes = ids.map((id, i) => {
    const hero = d.heroes.find((x) => x.id === id)!,
      stance = DUNGEON_HERO_STANCES[i]!;
    return { ...hero, stance, ...(hero.combat ? { combat: { ...hero.combat, stance } } : {}) };
  });
  // 死亡替补可能留下已行动的旧id；保留其已花行动，不给替补额外一日。
  const heroOrder =
    h?.phase === "heroActions" && reorder
      ? [
          ...h.heroOrder.filter((id) => h.actedHeroes?.includes(id)),
          ...ids.filter((id) => h.heroOrder.includes(id) && !h.actedHeroes?.includes(id)),
        ]
      : h?.heroOrder;
  const { hamletStanceProposal: _proposal, ...rest } = d;
  void _proposal;
  return {
    state: {
      ...state,
      dungeon: {
        ...rest,
        heroes,
        pending: null,
        ...(h ? { hamlet: { ...h, heroOrder: heroOrder! } } : {}),
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: "村庄姿态已调整；保留已花行动、建筑访问与资源（R32、R-093）",
      },
    ],
  };
}
export function setHamletStances(state: GameState, command: SetHamletStancesCommand): ApplyResult {
  if (!canSetHamletStances(state) || !validOrder(state, command.heroIds))
    return rejectBattleCommand(state, "请在村庄空闲窗口提交四名存活英雄的完整姿态排列");
  const d = state.dungeon!;
  if (d.hamlet?.phase !== "heroActions" || !d.hamlet.actedHeroes?.length)
    return applyOrder(state, command.heroIds, true);
  const pending = {
    id: `hamlet-stances:${d.decision}`,
    actorId: "party",
    prompt: `拟定姿态（进攻→防御→远程→支援）：${command.heroIds
      .map((id) => {
        const hero = d.heroes.find((h) => h.id === id)!;
        return d.battleCatalog?.heroStats.find((s) => s.id === hero.heroStatId)?.name ?? id;
      })
      .join(" → ")}。请玩家协商当日剩余行动顺序（R-093）`,
    options: [
      { id: "new-stances", label: "按新姿态重排余下英雄" },
      { id: "keep-day-order", label: "保留当天原行动队列" },
      { id: "cancel", label: "取消本次换位" },
    ],
  };
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        decision: d.decision + 1,
        hamletStanceProposal: [...command.heroIds],
        pending,
      },
    },
    events: [],
    pendingChoice: pending,
  };
}
export function chooseHamletStances(
  state: GameState,
  choiceId: string,
  optionId: string,
): ApplyResult {
  const d = state.dungeon,
    ids = d?.hamletStanceProposal;
  if (
    !d ||
    !ids ||
    d.pending?.id !== choiceId ||
    !choiceId.startsWith("hamlet-stances:") ||
    !["new-stances", "keep-day-order", "cancel"].includes(optionId) ||
    !d.pending.options.some((o) => o.id === optionId) ||
    !validOrder(state, ids)
  )
    return rejectBattleCommand(state, "村庄换位选择已失效");
  const { hamletStanceProposal: _proposal, ...rest } = d;
  void _proposal;
  const clean = { ...state, dungeon: { ...rest, pending: null } };
  if (!canSetHamletStances(clean)) return rejectBattleCommand(state, "村庄换位窗口已失效");
  if (optionId === "cancel") return { state: clean, events: [] };
  return applyOrder(clean, ids, optionId === "new-stances");
}
