import type { ApplyResult, GameState } from "./command";
import { rejectBattleCommand } from "./battle";
import { currentHamletHero, finishHamletAction } from "./hamlet-actions";
import { buildingLevelsProblem } from "./hamlet-buildings";
import { ownedHeroSkills } from "./hero-loadout";
import { trinketPoolProblem } from "./trinket-acquisition";

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
    buildingLevelsProblem(d) ||
    (d.trinkets !== undefined && trinketPoolProblem(d.trinkets, d.heroes))
  )
    return "请按村庄当天顺序访问公会（R33/34）";
  const stat = d.battleCatalog?.heroStats.find((s) => s.id === hero.heroStatId);
  const owned = d.battleCatalog ? ownedHeroSkills(hero, d.battleCatalog) : null;
  const equipped = Array.isArray(hero.skillIds)
    ? hero.skillIds.map((id) => owned?.find((s) => s.id === id))
    : [];
  const xp = hero.xp === undefined ? 0 : hero.xp,
    removed = hero.permanentlyRemovedSkillIds === undefined ? [] : hero.permanentlyRemovedSkillIds;
  return !stat?.attributesVerified ||
    ![1, 2, 3].includes(stat.level) ||
    !hero.attributesVerified ||
    ![1, 2, 3].includes(hero.level!) ||
    hero.level !== stat.level ||
    (hero.heroLevel !== undefined && hero.heroLevel !== hero.level) ||
    hero.life !== stat.life ||
    !Number.isSafeInteger(xp) ||
    xp < 0 ||
    !owned ||
    !equipped.length ||
    equipped.length > 2 + hero.level! ||
    equipped.some((s) => !s) ||
    new Set(equipped.map((s) => s!.name)).size !== equipped.length ||
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
function skillUpgrades(state: GameState) {
  const d = state.dungeon!,
    hero = currentHamletHero(state)!;
  if (d.gold < 1 || (hero.xp ?? 0) < 2) return [];
  const owned = ownedHeroSkills(hero, d.battleCatalog!)!;
  return owned.flatMap((old) => {
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
function heroUpgrade(state: GameState) {
  const d = state.dungeon!,
    hero = currentHamletHero(state)!,
    stat = d.battleCatalog!.heroStats.find((s) => s.id === hero.heroStatId)!;
  if (d.gold < 2 || (hero.xp ?? 0) < 4 || hero.level! >= 3) return null;
  const next = d.battleCatalog!.heroStats.filter(
    (s) =>
      s.name === stat.name &&
      s.level === hero.level! + 1 &&
      s.attributesVerified &&
      Number.isSafeInteger(s.life) &&
      s.life > hero.life!,
  );
  return next.length === 1 ? next[0]! : null;
}
function pending(state: GameState): ApplyResult {
  const d = state.dungeon!,
    hero = currentHamletHero(state)!,
    remaining = 2 - d.hamlet!.guildUpgrades!,
    nextHero = heroUpgrade(state);
  const choice = {
    id: `hamlet-guild:${d.decision}`,
    actorId: hero.id,
    prompt: `公会：还可升级${remaining}项（英雄4 XP+2金 / 技能2 XP+1金，含未装备拥有技能；R34）`,
    options: [
      ...(nextHero
        ? [
            {
              id: "upgrade-hero",
              label: `永久升级英雄 ${["I", "II", "III"][hero.level! - 1]}→${nextHero.level === 2 ? "II" : "III"}（4 XP，2金）`,
            },
          ]
        : []),
      ...skillUpgrades(state).map(({ old, next }) => ({
        id: `upgrade:${old.id}`,
        label: `永久升级 ${old.name} ${["I", "II", "III"][old.level - 1]}→${next.level === 2 ? "II" : "III"}${hero.skillIds!.includes(old.id) ? "" : "（未装备）"}（2 XP，1金）`,
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
function applySkillUpgrade(state: GameState, optionId: string): ApplyResult {
  const d = state.dungeon!,
    hero = currentHamletHero(state)!;
  const selected = skillUpgrades(state).find(({ old }) => `upgrade:${old.id}` === optionId);
  if (!selected)
    return rejectBattleCommand(state, "技能已达III、未拥有、未核实或XP/金币不足，未付款");
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
  const equipped = hero.skillIds!.includes(selected.old.id);
  const skillIds = equipped
    ? hero.skillIds!.map((id) => (id === selected.old.id ? selected.next.id : id))
    : hero.skillIds!;
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
        message: `${hero.id}支付2 XP和1金：${selected.old.name}永久升至${selected.next.level}级${equipped ? "" : "（未装备）"}，旧卡永久移出；铁匠归还卡按R-080同步（R29/34、R-004）`,
      },
      ...result.events,
    ],
  };
}
function applyHeroUpgrade(state: GameState): ApplyResult {
  const d = state.dungeon!,
    hero = currentHamletHero(state)!,
    nextStat = heroUpgrade(state);
  if (!nextStat)
    return rejectBattleCommand(state, "英雄已达III、缺已核实下级卡或XP/金币不足，未付款");
  const diseaseId = hero.diseaseId;
  const updated = {
    ...hero,
    xp: (hero.xp ?? 0) - 4,
    heroStatId: nextStat.id,
    level: nextStat.level,
    life: nextStat.life,
    attributesVerified: true as const,
    ...(hero.heroLevel !== undefined ? { heroLevel: nextStat.level } : {}),
    ...(diseaseId !== undefined ? { diseaseId } : {}),
    ...(hero.combat
      ? {
          combat: {
            ...hero.combat,
            heroStatId: nextStat.id,
            heroLevel: nextStat.level,
            life: nextStat.life,
            dodge: nextStat.dodge,
            skillIds: hero.skillIds!,
            diseaseId: hero.combat.diseaseId ?? diseaseId ?? null,
          },
        }
      : {}),
  };
  const heroes = d.heroes.map((a) => (a.id === hero.id ? updated : a));
  if (d.trinkets && trinketPoolProblem(d.trinkets, heroes))
    return rejectBattleCommand(state, "饰品容量与新英雄等级不一致，未付款（R26、R-051）");
  const count = d.hamlet!.guildUpgrades! + 1;
  const next = {
    ...state,
    dungeon: {
      ...d,
      gold: d.gold - 2,
      pending: null,
      heroes,
      hamlet: { ...d.hamlet!, guildUpgrades: count },
    },
  };
  const result = count === 2 ? finish(next) : pending(next);
  return {
    ...result,
    events: [
      {
        type: "dungeonUpdated",
        message: `${hero.id}支付4 XP和2金：英雄永久升至${nextStat.level}级，技能槽${2 + nextStat.level}、饰品槽${nextStat.level}；已有疾病/状态不因新免疫清除（R29/34、R21、R-051）`,
      },
      ...result.events,
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
  if (optionId === "upgrade-hero") return applyHeroUpgrade(state);
  return applySkillUpgrade(state, optionId);
}
