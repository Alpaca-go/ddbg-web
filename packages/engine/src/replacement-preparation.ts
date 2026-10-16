import type { ApplyResult, GameState, PendingChoice } from "./command";
import type { DungeonState } from "./dungeon";
import { rejectBattleCommand } from "./battle";
import { stagecoachWaitingTokens } from "./hamlet-buildings";
import { replacementHeroCandidates } from "./hero-death-estate";
import { ownedHeroSkills, heroSkillSlotCount } from "./hero-loadout";

type Hero = DungeonState["heroes"][number];
export type PreparedReplacement = { readonly deadHeroId: string; readonly hero: Hero };
export type ReplacementPreparation = {
  readonly deadHeroId: string;
  readonly stage: "hero" | "upgrades" | "skills";
  readonly upgrades: number;
  readonly hero?: Hero;
  readonly choice: PendingChoice;
};
type Draft = Omit<ReplacementPreparation, "choice">;
function preparationProblem(d: DungeonState, p: ReplacementPreparation) {
  if (
    !["hero", "upgrades", "skills"].includes(p.stage) ||
    !Number.isSafeInteger(p.upgrades) ||
    p.upgrades < 0 ||
    p.upgrades > 2 ||
    (p.stage === "upgrades" && p.upgrades === 2)
  )
    return true;
  if (p.stage === "hero") return p.hero !== undefined || p.upgrades !== 0;
  const h = p.hero,
    s = d.battleCatalog?.heroStats.find((s) => s.id === h?.heroStatId);
  return (
    !h ||
    !s?.attributesVerified ||
    !h.attributesVerified ||
    h.level !== s.level ||
    h.heroLevel !== s.level ||
    h.life !== s.life ||
    h.dead ||
    h.wounds !== 0 ||
    h.stress !== 0 ||
    h.diseaseId ||
    h.quirkIds?.length ||
    h.resolveCardId ||
    h.resolveTested ||
    !Number.isSafeInteger(h.xp) ||
    h.xp! < 0 ||
    !Array.isArray(h.skillIds) ||
    h.skillIds.length >= heroSkillSlotCount(h.level!) ||
    !ownedHeroSkills(h, d.battleCatalog!)
  );
}
function resourcesProblem(d: DungeonState) {
  return stagecoachWaitingTokens(d) === null ||
    !Number.isSafeInteger(d.stagecoachXp ?? 0) ||
    (d.stagecoachXp ?? 0) < 0
    ? "驿站代币/XP数据无效，未选择或扣资源（R33）"
    : null;
}
function deadHeroes(state: GameState) {
  return state.battle
    ? state.battle.entities.filter((h) => h.side === "hero" && h.dead)
    : state.dungeon!.heroes.filter((h) => h.dead);
}
function candidates(state: GameState) {
  return replacementHeroCandidates(state.dungeon!);
}
function upgrades(state: GameState, hero: Hero) {
  const catalog = state.dungeon!.battleCatalog!,
    stat = catalog.heroStats.find((s) => s.id === hero.heroStatId);
  const nextStats = catalog.heroStats.filter(
    (s) => s.name === stat?.name && s.level === hero.level! + 1 && s.attributesVerified,
  );
  const owned = ownedHeroSkills(hero, catalog) ?? [];
  return {
    stat:
      (hero.xp ?? 0) >= 4 && hero.level! < 3 && nextStats.length === 1 ? nextStats[0] : undefined,
    skills:
      (hero.xp ?? 0) < 2
        ? []
        : owned.flatMap((old) => {
            const next = catalog.skills.filter(
              (s) =>
                s.hero === old.hero &&
                s.name === old.name &&
                s.level === old.level + 1 &&
                !s.verification.unverified &&
                !hero.permanentlyRemovedSkillIds?.includes(s.id),
            );
            return old.level < 3 && next.length === 1 ? [{ old, next: next[0]! }] : [];
          }),
  };
}
function options(state: GameState, draft: Draft): PendingChoice["options"] {
  if (draft.stage === "hero")
    return candidates(state).map((s) => ({
      id: s.id,
      label: `选择 ${s.name} I（继承${state.dungeon!.stagecoachXp ?? 0} XP，消耗1枚等待代币）`,
    }));
  const hero = draft.hero!;
  if (draft.stage === "skills")
    return (ownedHeroSkills(hero, state.dungeon!.battleCatalog!) ?? [])
      .filter((s) => !hero.skillIds!.includes(s.id))
      .map((s) => ({ id: s.id, label: `装备 ${s.name} ${s.level}` }));
  const next = upgrades(state, hero);
  return [
    ...(next.stat
      ? [{ id: "upgrade-hero", label: `英雄升至${next.stat.level}级（4 XP，免金币）` }]
      : []),
    ...next.skills.map(({ old, next }) => ({
      id: `upgrade:${old.id}`,
      label: `${old.name}升至${next.level}级（2 XP，免金币）`,
    })),
    { id: "finish-upgrades", label: "结束升级，选择初始技能" },
  ];
}
function present(state: GameState, draft: Draft, message: string): ApplyResult {
  const d = state.dungeon!,
    cursor = d.replacementChoiceCursor ?? 0;
  const choice: PendingChoice = {
    id: `replacement:${cursor}`,
    actorId: draft.deadHeroId,
    prompt:
      draft.stage === "hero"
        ? "驿站：选择替补英雄（R31/R33）"
        : draft.stage === "upgrades"
          ? `替补准备：剩余${draft.hero!.xp} XP，还可免费升级${2 - draft.upgrades}项`
          : `选择初始技能（${draft.hero!.skillIds!.length}/${heroSkillSlotCount(draft.hero!.level!)}）`,
    options: options(state, draft),
  };
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        replacementPreparation: { ...draft, choice },
        replacementChoiceCursor: cursor + 1,
      },
    },
    events: [{ type: "dungeonUpdated", message }],
    pendingChoice: choice,
  };
}

/** R31/R33：饰品先结算；候选不足是数据停点，只有代币耗尽判战役失败。 */
export function beginReplacementPreparation(state: GameState): ApplyResult {
  const d = state.dungeon;
  if (
    !d ||
    !d.battleCatalog ||
    d.deathTrinketChoice ||
    d.replacementPreparation ||
    d.campaignFailure ||
    resourcesProblem(d)
  )
    return rejectBattleCommand(
      state,
      d ? (resourcesProblem(d) ?? "请先完成当前死亡/替补选择") : "没有战役",
    );
  const dead = deadHeroes(state).find(
    (h) => !(d.preparedReplacements ?? []).some((p) => p.deadHeroId === h.id),
  );
  if (
    !dead ||
    !d.deadHeroNames?.includes(
      d.battleCatalog.heroStats.find((s) => s.id === dead.heroStatId)?.name ?? "",
    ) ||
    (state.battle?.trinkets ?? d.trinkets)?.held.some((t) =>
      deadHeroes(state).some((h) => h.id === t.heroId),
    )
  )
    return rejectBattleCommand(state, "需有已登记、饰品处置完成且尚未准备替补的死者（R31）");
  if (stagecoachWaitingTokens(d) === 0)
    return {
      state: { ...state, dungeon: { ...d, campaignFailure: "noWaitingHeroes" } },
      events: [{ type: "dungeonUpdated", message: "没有等待英雄代币可移除，战役失败（R33）" }],
    };
  if (!candidates(state).length)
    return rejectBattleCommand(
      state,
      "当前获批可用英雄目录不足，保持停点；未扣代币、未判战役失败（R-048）",
    );
  return present(
    state,
    { deadHeroId: dead.id, stage: "hero", upgrades: 0 },
    "开始驿站替补选择；尚未扣代币",
  );
}

export function chooseReplacementPreparation(
  state: GameState,
  choiceId: string,
  optionId: string,
): ApplyResult {
  const d = state.dungeon,
    p = d?.replacementPreparation;
  if (
    !d ||
    !p ||
    resourcesProblem(d) ||
    preparationProblem(d, p) ||
    p.choice.id !== choiceId ||
    !p.choice.options.some((o) => o.id === optionId) ||
    !options(state, p).some((o) => o.id === optionId) ||
    !deadHeroes(state).some((h) => h.id === p.deadHeroId)
  )
    return rejectBattleCommand(state, "替补准备选择无效、过期或资源不足，未扣资源");
  if (p.stage === "hero") {
    const stat = candidates(state).find((s) => s.id === optionId),
      tokens = stagecoachWaitingTokens(d)!;
    if (!stat || tokens < 1) return rejectBattleCommand(state, "候选已不可用或代币不足");
    const hero: Hero = {
      id: `replacement-${d.replacementChoiceCursor}`,
      heroStatId: stat.id,
      attributesVerified: true,
      level: 1,
      heroLevel: 1,
      life: stat.life,
      wounds: 0,
      stress: 0,
      dead: false,
      xp: d.stagecoachXp ?? 0,
      skillIds: [],
      permanentlyRemovedSkillIds: [],
      quirkIds: [],
      diseaseId: null,
      resolveTested: false,
    };
    if (!ownedHeroSkills(hero, d.battleCatalog!))
      return rejectBattleCommand(state, "替补技能目录不完整（R-048）");
    return present(
      { ...state, dungeon: { ...d, waitingHeroTokens: tokens - 1 } },
      { deadHeroId: p.deadHeroId, hero, stage: "upgrades", upgrades: 0 },
      "选择替补：扣1枚等待代币，继承全部驿站XP；驿站XP不扣（R31/R33）",
    );
  }
  let hero = p.hero!,
    count = p.upgrades;
  if (p.stage === "upgrades") {
    if (optionId !== "finish-upgrades") {
      if (count >= 2) return rejectBattleCommand(state, "替补最多两项免费升级（R31）");
      const next = upgrades(state, hero);
      if (optionId === "upgrade-hero") {
        if (!next.stat) return rejectBattleCommand(state, "英雄升级条件不足");
        hero = {
          ...hero,
          heroStatId: next.stat.id,
          level: next.stat.level,
          heroLevel: next.stat.level,
          life: next.stat.life,
          xp: hero.xp! - 4,
        };
      } else {
        const skill = next.skills.find(({ old }) => `upgrade:${old.id}` === optionId);
        if (!skill) return rejectBattleCommand(state, "技能升级条件不足");
        hero = {
          ...hero,
          xp: hero.xp! - 2,
          permanentlyRemovedSkillIds: [...hero.permanentlyRemovedSkillIds!, skill.old.id],
        };
      }
      count++;
    }
    return present(
      state,
      {
        deadHeroId: p.deadHeroId,
        hero,
        upgrades: count,
        stage: optionId === "finish-upgrades" || count === 2 ? "skills" : "upgrades",
      },
      "替补免费升级已处理，剩余XP保留（R-039）",
    );
  }
  hero = { ...hero, skillIds: [...hero.skillIds!, optionId] };
  if (hero.skillIds!.length < heroSkillSlotCount(hero.level!))
    return present(
      state,
      { deadHeroId: p.deadHeroId, hero, upgrades: count, stage: "skills" },
      "已选择一张初始技能",
    );
  const { replacementPreparation: _p, ...rest } = d;
  void _p;
  const pending = state.battle?.pending?.choice ?? d.pending;
  return {
    state: {
      ...state,
      dungeon: {
        ...rest,
        preparedReplacements: [
          ...(d.preparedReplacements ?? []),
          { deadHeroId: p.deadHeroId, hero },
        ],
      },
    },
    events: [
      { type: "dungeonUpdated", message: "替补准备完成，尚未入队；等待战后/探索/回村续接（R31）" },
    ],
    ...(pending ? { pendingChoice: pending } : {}),
  };
}
