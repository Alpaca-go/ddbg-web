import type { ApplyResult, GameState } from "./command";
import { rejectBattleCommand } from "./battle";
import { currentHamletHero, finishHamletAction } from "./hamlet-actions";
import { buildingLevelsProblem } from "./hamlet-buildings";

function problem(state: GameState) {
  const d = state.dungeon,
    h = d?.hamlet,
    hero = currentHamletHero(state);
  if (
    !d ||
    state.battle ||
    d.phase !== "inHamlet" ||
    d.hamletReturn?.phase !== "complete" ||
    h?.phase !== "heroActions" ||
    h.active ||
    !hero ||
    d.heroes.length !== 4 ||
    d.heroes.some(
      (a) => a.dead || !Number.isSafeInteger(a.stress) || a.stress < 0 || a.stress > 9,
    ) ||
    !h.preparationDays ||
    (h.remainingDays ?? h.preparationDays) < 1 ||
    !Number.isSafeInteger(d.gold) ||
    d.gold < 0 ||
    buildingLevelsProblem(d)
  )
    return "请按村庄当天顺序访问公会（R33/34）";
  const stat = d.battleCatalog?.heroStats.find((s) => s.id === hero.heroStatId);
  const skills = Array.isArray(hero.skillIds)
    ? hero.skillIds.map((id) => d.battleCatalog?.skills.find((c) => c.id === id))
    : [];
  const xp = hero.xp === undefined ? 0 : hero.xp,
    removed = hero.permanentlyRemovedSkillIds === undefined ? [] : hero.permanentlyRemovedSkillIds;
  return !stat?.attributesVerified ||
    stat.level !== 1 ||
    !hero.attributesVerified ||
    hero.level !== 1 ||
    (hero.heroLevel !== undefined && hero.heroLevel !== hero.level) ||
    !Number.isSafeInteger(xp) ||
    xp < 0 ||
    !skills?.length ||
    skills.some(
      (s) =>
        !s?.name ||
        s.hero !== stat.name ||
        ![1, 2, 3].includes(s.level) ||
        s.verification.unverified,
    ) ||
    new Set(skills.map((s) => s!.name)).size !== skills.length ||
    !Array.isArray(removed) ||
    new Set(removed).size !== removed.length ||
    removed.some(
      (id) =>
        hero.skillIds!.includes(id) ||
        !d.battleCatalog!.skills.some(
          (s) => s.id === id && s.hero === stat.name && s.level < 3 && !s.verification.unverified,
        ),
    )
    ? "公会缺已核实英雄/技能、有效个人XP或永久移除记录（R-004、R-048）"
    : null;
}
function upgrades(state: GameState) {
  const d = state.dungeon!,
    hero = currentHamletHero(state)!;
  if (d.gold < 1 || (hero.xp ?? 0) < 2) return [];
  return hero.skillIds!.flatMap((id) => {
    const old = d.battleCatalog!.skills.find((s) => s.id === id)!;
    const next = d.battleCatalog!.skills.filter(
      (s) =>
        s.hero === old.hero &&
        s.name === old.name &&
        s.level === old.level + 1 &&
        !s.verification.unverified &&
        !hero.permanentlyRemovedSkillIds?.includes(s.id),
    );
    return old.level < 3 && next.length === 1 ? [{ old, next: next[0]! }] : [];
  });
}
function pending(state: GameState): ApplyResult {
  const d = state.dungeon!,
    hero = currentHamletHero(state)!;
  const choice = {
    id: `hamlet-guild:${d.decision}`,
    actorId: hero.id,
    prompt: `公会：还可升级${2 - d.hamlet!.guildUpgrades!}项技能，每项2 XP和1金；英雄等级升级继续开发（R34）`,
    options: [
      ...upgrades(state).map(({ old, next }) => ({
        id: `upgrade:${old.id}`,
        label: `永久升级 ${old.name} ${["I", "II", "III"][old.level - 1]}→${next.level === 2 ? "II" : "III"}（2 XP，1金）`,
      })),
      { id: "leave", label: "结束公会访问" },
    ],
  };
  return {
    state: { ...state, dungeon: { ...d, decision: d.decision + 1, pending: choice } },
    pendingChoice: choice,
    events: [{ type: "dungeonUpdated", message: choice.prompt }],
  };
}
export function visitGuild(state: GameState, actorId: string): ApplyResult {
  const reason = problem(state),
    d = state.dungeon,
    h = d?.hamlet;
  if (
    reason ||
    !d ||
    !h ||
    d.pending ||
    h.guildUpgrades !== undefined ||
    currentHamletHero(state)!.id !== actorId ||
    h.blockedBuildings.includes("guild") ||
    h.visitedBuildings?.includes("guild")
  )
    return rejectBattleCommand(state, reason ?? "公会已封锁/占用、有待选或不是当前英雄");
  return pending({
    ...state,
    dungeon: {
      ...d,
      hamlet: {
        ...h,
        guildUpgrades: 0,
        visitedBuildings: [...(h.visitedBuildings ?? []), "guild"],
      },
    },
  });
}
function finish(state: GameState): ApplyResult {
  const d = state.dungeon!,
    actor = currentHamletHero(state)!;
  const h = { ...d.hamlet! };
  delete h.guildUpgrades;
  return {
    state: {
      ...state,
      dungeon: finishHamletAction({ ...d, hamlet: h, pending: null }, actor.id, false),
    },
    events: [
      { type: "dungeonUpdated", message: `${actor.id}结束公会访问；每次最多两项升级（R34）` },
    ],
  };
}
export function chooseGuild(state: GameState, choiceId: string, optionId: string): ApplyResult {
  const reason = problem(state),
    d = state.dungeon,
    p = d?.pending,
    hero = currentHamletHero(state);
  if (
    reason ||
    !d ||
    !hero ||
    !p ||
    p.id !== choiceId ||
    !p.id.startsWith("hamlet-guild:") ||
    p.actorId !== hero.id ||
    !p.options.some((o) => o.id === optionId) ||
    ![0, 1].includes(d.hamlet!.guildUpgrades!) ||
    !d.hamlet!.visitedBuildings?.includes("guild")
  )
    return rejectBattleCommand(state, reason ?? "请完成当前公会的有效升级选择");
  if (optionId === "leave") return finish(state);
  const selected = upgrades(state).find(({ old }) => `upgrade:${old.id}` === optionId);
  if (!selected)
    return rejectBattleCommand(state, "技能已达III、未装备、未核实或XP/金币不足，未付款");
  const plans = hero.nextQuestSkillUpgrades;
  if (
    plans !== undefined &&
    (!Array.isArray(plans) ||
      plans.some((u) => !u) ||
      new Set(plans.map((u) => u.originalSkillId)).size !== plans.length ||
      plans.some(
        (u) =>
          !hero.skillIds!.includes(u.originalSkillId) ||
          !d.battleCatalog!.skills.some(
            (s) =>
              s.id === u.temporarySkillId &&
              !s.verification.unverified &&
              [2, 3].includes(s.level) &&
              s.hero === selected.old.hero &&
              s.name === d.battleCatalog!.skills.find((c) => c.id === u.originalSkillId)?.name,
          ),
      ))
  )
    return rejectBattleCommand(state, "铁匠临时卡记录无效，未付款或移除原卡");
  const skillIds = hero.skillIds!.map((id) => (id === selected.old.id ? selected.next.id : id));
  const updated = {
    ...hero,
    xp: (hero.xp ?? 0) - 2,
    skillIds,
    permanentlyRemovedSkillIds: [...(hero.permanentlyRemovedSkillIds ?? []), selected.old.id],
    ...(hero.combat ? { combat: { ...hero.combat, skillIds } } : {}),
    ...(plans
      ? {
          nextQuestSkillUpgrades: plans.map((u) =>
            u.originalSkillId !== selected.old.id
              ? u
              : {
                  originalSkillId: selected.next.id,
                  temporarySkillId:
                    d.battleCatalog!.skills.find((c) => c.id === u.temporarySkillId)!.level <
                    selected.next.level
                      ? selected.next.id
                      : u.temporarySkillId,
                },
          ),
        }
      : {}),
  };
  const count = d.hamlet!.guildUpgrades! + 1;
  const next = {
    ...state,
    dungeon: {
      ...d,
      gold: d.gold - 1,
      pending: null,
      heroes: d.heroes.map((a) => (a.id === hero.id ? updated : a)),
      hamlet: { ...d.hamlet!, guildUpgrades: count },
    },
  };
  const result = count === 2 ? finish(next) : pending(next);
  return {
    ...result,
    events: [
      {
        type: "dungeonUpdated",
        message: `${hero.id}支付2 XP和1金：${selected.old.name}永久升至${selected.next.level}级，旧卡永久移出；铁匠归还卡按R-080同步（R29/34、R-004）`,
      },
      ...result.events,
    ],
  };
}
