import { skillBelongsToFormalHero } from "./formal-roster-catalog";
import type { ApplyResult, GameState } from "./command";
import { rejectBattleCommand } from "./battle";
import { completeHamletEvent, hamletEventCompletionProblem } from "./hamlet-event";
import { buildingLevelsProblem } from "./hamlet-buildings";
import { ownedHeroSkills } from "./hero-loadout";
import { trinketPoolProblem } from "./trinket-acquisition";

function problem(state: GameState) {
  const d = state.dungeon;
  return !d ||
    state.battle ||
    d.phase !== "inHamlet" ||
    d.hamletReturn?.phase !== "complete" ||
    !["hamlet_event:p015", "hamlet_event:p016"].includes(d.hamlet?.active ?? "") ||
    d.heroes.length !== 4 ||
    new Set(d.heroes.map((h) => h.id)).size !== 4 ||
    d.heroes.some((h) => h.dead) ||
    !d.battleCatalog ||
    buildingLevelsProblem(d) ||
    (d.trinkets !== undefined && trinketPoolProblem(d.trinkets, d.heroes))
    ? "请先完成回村和死亡英雄补位，不能结算Guild Training"
    : hamletEventCompletionProblem(d);
}

function skillUpgrades(state: GameState, heroId: string) {
  const d = state.dungeon!,
    hero = d.heroes.find((h) => h.id === heroId);
  if (!hero || !d.battleCatalog) return [];
  const owned = ownedHeroSkills(hero, d.battleCatalog);
  if (!owned) return [];
  return owned.flatMap((old) => {
    const next = d.battleCatalog!.skills.filter(
      (s) =>
        skillBelongsToFormalHero(
          d.battleCatalog!.heroStats.find((c) => c.id === hero.heroStatId)!.name!,
          s,
        ) &&
        s.name === old.name &&
        s.level === old.level + 1 &&
        !s.verification.unverified &&
        !hero.permanentlyRemovedSkillIds?.includes(s.id),
    );
    return old.level < 3 &&
      (d.hamlet?.active !== "hamlet_event:p016" || old.level === 1) &&
      next.length === 1
      ? [{ old, next: next[0]! }]
      : [];
  });
}

function continueGuildTraining(state: GameState): ApplyResult {
  const d = state.dungeon!,
    h = d.hamlet!;
  const id = h.eventRemainingHeroes?.[0];
  const militia = h.active === "hamlet_event:p016";
  if (!id) return completeHamletEvent(state, militia ? 0 : undefined);
  const hero = d.heroes.find((candidate) => candidate.id === id)!;
  const upgrades = skillUpgrades(state, id);
  if (!upgrades.length && militia)
    return rejectBattleCommand(state, "Militia Training全员升级需要每名英雄都有可升级的I级技能");
  if (!upgrades.length)
    return continueGuildTraining({
      ...state,
      dungeon: { ...d, hamlet: { ...h, eventRemainingHeroes: h.eventRemainingHeroes!.slice(1) } },
    });
  const pending = {
    id: `hamlet-guild-training:${d.decision}`,
    actorId: id,
    prompt: militia
      ? `Militia Training：${id}选择免费永久升级一项I级技能（卡面p16）`
      : `Guild Training：${id}可免费永久升级一项技能，或放弃（卡面p15）`,
    options: [
      ...upgrades.map(({ old, next }) => ({
        id: `upgrade:${old.id}`,
        label: `免费升级 ${old.name} ${["I", "II", "III"][old.level - 1]}→${next.level === 2 ? "II" : "III"}${hero.skillIds!.includes(old.id) ? "" : "（未装备）"}`,
      })),
      ...(militia ? [] : [{ id: "skip", label: "放弃免费技能升级" }]),
    ],
  };
  return {
    state: { ...state, dungeon: { ...d, pending, decision: d.decision + 1 } },
    events: [{ type: "dungeonUpdated", message: pending.prompt }],
    pendingChoice: pending,
  };
}

/** 印刷卡p15、R32/33：每名英雄可免费永久升一项技能；事件永久移出。 */
export function beginGuildTraining(state: GameState): ApplyResult {
  const reason = problem(state);
  if (reason) return rejectBattleCommand(state, reason);
  const d = state.dungeon!,
    stances = ["aggressive", "defensive", "ranged", "support"];
  for (const hero of d.heroes) {
    if (!ownedHeroSkills(hero, d.battleCatalog!))
      return rejectBattleCommand(state, "Guild Training缺已核实英雄技能拥有集（R-048）");
  }
  const order = [...d.heroes]
    .sort((a, b) => stances.indexOf(a.stance!) - stances.indexOf(b.stance!))
    .filter((hero) => skillUpgrades(state, hero.id).length)
    .map((hero) => hero.id);
  return continueGuildTraining({
    ...state,
    dungeon: { ...d, hamlet: { ...d.hamlet!, eventRemainingHeroes: order } },
  });
}

/** p16 / R-077：先集体决定，接受才逐英雄必选一项I→II；不产生半队免费升级。 */
export function beginMilitiaTraining(state: GameState): ApplyResult {
  const reason = problem(state);
  if (reason || state.dungeon?.hamlet?.active !== "hamlet_event:p016")
    return rejectBattleCommand(state, reason ?? "当前不是Militia Training");
  const d = state.dungeon!;
  if (d.heroes.some((hero) => !ownedHeroSkills(hero, d.battleCatalog!)))
    return rejectBattleCommand(state, "Militia Training缺已核实英雄技能拥有集（R-048）");
  const canTrain = d.heroes.every((hero) => skillUpgrades(state, hero.id).length > 0);
  const pending = {
    id: `hamlet-militia:${d.decision}`,
    actorId: "party",
    prompt: "Militia Training：全员各免费升级一项I级技能并跳过村庄准备，或保留3天准备",
    options: [
      ...(canTrain ? [{ id: "train", label: "全员升级，0天准备" }] : []),
      { id: "decline", label: "不升级，3天准备" },
    ],
  };
  return {
    state: { ...state, dungeon: { ...d, pending, decision: d.decision + 1 } },
    events: [{ type: "dungeonUpdated", message: pending.prompt }],
    pendingChoice: pending,
  };
}

export function chooseMilitiaTraining(
  state: GameState,
  choiceId: string,
  optionId: string,
): ApplyResult {
  const reason = problem(state),
    d = state.dungeon,
    p = d?.pending;
  if (
    reason ||
    d?.hamlet?.active !== "hamlet_event:p016" ||
    !p?.id.startsWith("hamlet-militia:") ||
    p.id !== choiceId ||
    !p.options.some((o) => o.id === optionId)
  )
    return rejectBattleCommand(state, reason ?? "Militia Training集体选择已过期或无效");
  if (optionId === "decline") return completeHamletEvent(state, 3);
  if (
    optionId !== "train" ||
    d.heroes.some(
      (hero) => !ownedHeroSkills(hero, d.battleCatalog!) || !skillUpgrades(state, hero.id).length,
    )
  )
    return rejectBattleCommand(state, "必须全员都有一项可升级的I级技能，未开始升级");
  return beginGuildTraining({ ...state, dungeon: { ...d, pending: null } });
}

export function chooseGuildTraining(
  state: GameState,
  choiceId: string,
  optionId: string,
): ApplyResult {
  const reason = problem(state);
  if (reason) return rejectBattleCommand(state, reason);
  const d = state.dungeon!,
    h = d.hamlet!,
    pending = d.pending,
    order = h.eventRemainingHeroes,
    hero = d.heroes.find((candidate) => candidate.id === order?.[0]);
  const upgrades = hero ? skillUpgrades(state, hero.id) : [];
  if (
    !pending ||
    !pending.id.startsWith("hamlet-guild-training:") ||
    pending.id !== choiceId ||
    !hero ||
    hero.id !== pending.actorId ||
    !Array.isArray(order) ||
    !order.length ||
    new Set(order).size !== order.length ||
    !pending.options.some((o) => o.id === optionId) ||
    (optionId !== "skip" && !upgrades.some(({ old }) => `upgrade:${old.id}` === optionId))
  )
    return rejectBattleCommand(state, "请按事件顺序为当前英雄选择一项免费技能升级，或放弃");
  let heroes = d.heroes;
  if (optionId !== "skip") {
    const selected = upgrades.find(({ old }) => `upgrade:${old.id}` === optionId)!;
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
                skillBelongsToFormalHero(
                  d.battleCatalog!.heroStats.find((c) => c.id === hero.heroStatId)!.name!,
                  s,
                ) &&
                s.name === d.battleCatalog!.skills.find((c) => c.id === u.originalSkillId)?.name,
            ),
        ))
    )
      return rejectBattleCommand(state, "铁匠临时卡记录无效，未升级");
    const equipped = hero.skillIds!.includes(selected.old.id);
    const skillIds = equipped
      ? hero.skillIds!.map((id) => (id === selected.old.id ? selected.next.id : id))
      : hero.skillIds!;
    const updated = {
      ...hero,
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
    heroes = d.heroes.map((candidate) => (candidate.id === hero.id ? updated : candidate));
  }
  const next = continueGuildTraining({
    ...state,
    dungeon: {
      ...d,
      pending: null,
      heroes,
      hamlet: { ...h, eventRemainingHeroes: order.slice(1) },
    },
  });
  return {
    ...next,
    events: [
      {
        type: "dungeonUpdated",
        message: `${hero.id}：${optionId === "skip" ? "放弃免费技能升级" : `免费永久升级 ${optionId}`}（${h.active === "hamlet_event:p016" ? "Militia Training、卡面p16" : "Guild Training、卡面p15"}）`,
      },
      ...next.events,
    ],
  };
}
