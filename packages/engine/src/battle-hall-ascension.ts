import { rejectBattleCommand } from "./battle";
import type { ApplyResult, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { ownedHeroSkills, questHeroSkillCount } from "./hero-loadout";
import { applyTemporarySkillUpgrades, restoreTemporarySkillUpgrades } from "./hamlet-embark";
import { skillBelongsToFormalHero } from "./formal-roster-catalog";
import { triggerBattlePassive } from "./battle-passive";
import { pressureCasualties, resolveBattlePressure } from "./pressure";
import { endAfterCasualties, finishTurn, removeCasualties } from "./encounter";

type Hero = DungeonState["heroes"][number];
type Upgrade = { id: string; label: string; hero: Hero; gold: number };

function upgrades(state: GameState, actorId: string): Upgrade[] {
  const d = state.dungeon,
    b = state.battle;
  const hero = d?.heroes.find((h) => h.id === actorId);
  const actor = b?.entities.find((e) => e.id === actorId && e.side === "hero");
  const catalog = d?.battleCatalog;
  if (
    !hero ||
    hero.dead ||
    !hero.attributesVerified ||
    !actor ||
    !catalog ||
    !b ||
    !b.loot ||
    !Number.isSafeInteger(hero.xp ?? 0) ||
    (hero.xp ?? 0) < 0 ||
    !Number.isSafeInteger(b.loot.gold) ||
    b.loot.gold < 0
  )
    return [];
  const restored = restoreTemporarySkillUpgrades([hero])[0]!;
  const { nextQuestSkillUpgrades: _plans, ...permanent } = {
    ...hero,
    skillIds: restored.skillIds ?? [],
  };
  void _plans;
  const owned = ownedHeroSkills(permanent, catalog);
  const stat = catalog.heroStats.find((s) => s.id === hero.heroStatId);
  const reapplied = applyTemporarySkillUpgrades(
    [
      {
        ...permanent,
        ...(hero.nextQuestSkillUpgrades
          ? { nextQuestSkillUpgrades: hero.nextQuestSkillUpgrades }
          : {}),
      },
    ],
    catalog,
  );
  if (
    !owned ||
    !stat?.attributesVerified ||
    hero.level !== stat.level ||
    actor.heroStatId !== stat.id ||
    actor.heroLevel !== stat.level ||
    actor.life !== stat.life ||
    hero.life !== stat.life ||
    (hero.heroLevel !== undefined && hero.heroLevel !== stat.level) ||
    hero.skillIds?.length !== questHeroSkillCount(hero) ||
    JSON.stringify(actor.skillIds) !== JSON.stringify(hero.skillIds) ||
    !("heroes" in reapplied) ||
    JSON.stringify(reapplied.heroes[0]!.skillIds) !== JSON.stringify(hero.skillIds)
  )
    return [];
  const options: Upgrade[] = [];
  if ((hero.xp ?? 0) >= 4 && b.loot.gold >= 2 && stat.level < 3) {
    const next = catalog.heroStats.filter(
      (s) =>
        s.name === stat.name &&
        s.level === stat.level + 1 &&
        s.attributesVerified &&
        Number.isSafeInteger(s.life) &&
        s.life > stat.life,
    );
    if (next.length === 1)
      options.push({
        id: "hero",
        label: `英雄升级至${next[0]!.level}级（4 XP、2金；新技能槽留空）`,
        gold: 2,
        hero: {
          ...hero,
          xp: (hero.xp ?? 0) - 4,
          heroStatId: next[0]!.id,
          level: next[0]!.level,
          life: next[0]!.life,
          hallAscensionVacantSlots: (hero.hallAscensionVacantSlots ?? 0) + 1,
          ...(hero.heroLevel !== undefined ? { heroLevel: next[0]!.level } : {}),
        },
      });
  }
  if ((hero.xp ?? 0) >= 2 && b.loot.gold >= 1)
    for (const old of owned) {
      const next = catalog.skills.filter(
        (s) =>
          skillBelongsToFormalHero(stat.name!, s) &&
          s.name === old.name &&
          s.level === old.level + 1 &&
          !s.verification.unverified &&
          !hero.permanentlyRemovedSkillIds?.includes(s.id),
      );
      if (old.level >= 3 || next.length !== 1) continue;
      const skill = next[0]!;
      const updated = {
        ...permanent,
        xp: (hero.xp ?? 0) - 2,
        skillIds: permanent.skillIds!.map((id) => (id === old.id ? skill.id : id)),
        permanentlyRemovedSkillIds: [...(hero.permanentlyRemovedSkillIds ?? []), old.id],
        ...(hero.nextQuestSkillUpgrades
          ? {
              nextQuestSkillUpgrades: hero.nextQuestSkillUpgrades.map((p) =>
                p.originalSkillId === old.id
                  ? {
                      ...p,
                      originalSkillId: skill.id,
                      temporarySkillId:
                        catalog.skills.find((s) => s.id === p.temporarySkillId)!.level < skill.level
                          ? skill.id
                          : p.temporarySkillId,
                    }
                  : p,
              ),
            }
          : {}),
      };
      const applied = applyTemporarySkillUpgrades([updated], catalog);
      if ("heroes" in applied)
        options.push({
          id: `skill:${old.id}`,
          label: `${old.name}升级至${skill.level}级${permanent.skillIds!.includes(old.id) ? "" : "（未装备）"}（2 XP、1金）`,
          gold: 1,
          hero: applied.heroes[0]!,
        });
    }
  return options;
}

function canInteract(state: GameState, actorId: string) {
  const b = state.battle,
    t = b?.encounter?.turn;
  const actor = b?.entities.find((e) => e.id === actorId);
  return !!(
    state.dungeon?.phase === "inBattle" &&
    b &&
    t?.type === "hero" &&
    t.actorId === actorId &&
    t.actions >= 2 &&
    !t.mustMove &&
    actor?.side === "hero" &&
    !actor.dead &&
    b.areas.find((a) => a.id === actor.areaId)?.hallOfAscension &&
    !b.shuffleIntents.length &&
    !b.shuffleContinuation &&
    !state.dungeon.pending
  );
}

/** R-153–155：先选升级内容，确认时才支付行动与压力；没有每任务使用次数限制。 */
export function beginHallAscension(state: GameState, actorId: string): ApplyResult {
  if (!canInteract(state, actorId) || state.battle!.pending)
    return rejectBattleCommand(state, "升华大厅需要当前英雄位于B区、有2行动且无待选或强制移动");
  const options = upgrades(state, actorId);
  if (!options.length)
    return rejectBattleCommand(state, "缺少可升级的获批卡、XP或金币，未支付行动与压力");
  const b = state.battle!;
  const choice = {
    id: `hall-ascension:${b.choiceCursor}`,
    actorId,
    prompt: "升华大厅：2行动、压力+3，并支付对应XP/金币；压力结算后存活才升级",
    options: [
      ...options.map(({ id, label }) => ({ id, label })),
      { id: "cancel", label: "取消（不支付费用）" },
    ],
  };
  return {
    state: {
      ...state,
      battle: {
        ...b,
        choiceCursor: b.choiceCursor + 1,
        pending: { type: "hallAscension", actorId, choice },
      },
    },
    events: [],
    pendingChoice: choice,
  };
}

export function chooseHallAscension(state: GameState, optionId: string): ApplyResult {
  const b = state.battle!,
    p = b.pending;
  if (p?.type !== "hallAscension" || !canInteract(state, p.actorId))
    return rejectBattleCommand(state, "升华大厅选择上下文已失效");
  if (optionId === "cancel")
    return { state: { ...state, battle: { ...b, pending: null } }, events: [] };
  const selected = upgrades(state, p.actorId).find((o) => o.id === optionId);
  if (!selected) return rejectBattleCommand(state, "升级选项、XP或金币无效，未支付任何费用");
  const t = b.encounter!.turn;
  if (t.type !== "hero") return rejectBattleCommand(state, "不是英雄回合");
  const paid = triggerBattlePassive({ ...b, pending: null }, state.seed, [p.actorId], {
    type: "stress",
    amount: 3,
  });
  if (paid.status === "refused") return rejectBattleCommand(state, paid.reason);
  const pressure = resolveBattlePressure({
    state: {
      ...state,
      battle: {
        ...paid.battle,
        encounter: { ...b.encounter!, turn: { ...t, actions: t.actions - 2 } },
      },
    },
    events: [
      ...paid.events,
      {
        type: "roomInteractionResolved",
        actorId: p.actorId,
        message: "升华大厅：支付2行动，先完整结算压力+3（R-069、R-154）",
      },
    ],
  });
  const refused = pressure.events.find((e) => e.type === "commandRefused");
  if (refused) return rejectBattleCommand(state, refused.message);
  let result = removeCasualties(pressure, pressureCasualties(b, pressure));
  const ended = endAfterCasualties(result);
  if (ended) return ended;
  const live = result.state.battle!.entities.find((e) => e.id === p.actorId)!;
  if (!live.dead) {
    const d = result.state.dungeon!,
      current = result.state.battle!;
    const stat = d.battleCatalog!.heroStats.find((s) => s.id === selected.hero.heroStatId)!;
    const entity = {
      ...live,
      heroStatId: stat.id,
      heroLevel: stat.level,
      life: stat.life,
      dodge: optionId === "hero" ? stat.dodge : live.dodge,
      skillIds: selected.hero.skillIds!,
    };
    const hero = { ...selected.hero, combat: entity };
    const gold = current.loot!.gold - selected.gold;
    result = {
      state: {
        ...result.state,
        dungeon: {
          ...d,
          gold,
          ...(d.lootPool ? { lootPool: { ...d.lootPool, gold } } : {}),
          heroes: d.heroes.map((h) => (h.id === hero.id ? hero : h)),
        },
        battle: {
          ...current,
          loot: { ...current.loot!, gold },
          entities: current.entities.map((e) => (e.id === entity.id ? entity : e)),
        },
      },
      events: [
        ...result.events,
        {
          type: "roomInteractionResolved",
          actorId: p.actorId,
          message: `升华大厅：${selected.label}；旧卡永久移出，已有伤口、疾病及状态保留（R29/R34、R-154/155）`,
        },
      ],
    };
  }
  return finishTurn(result.state, p.actorId, result.events);
}
