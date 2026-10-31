import { settleFreeTrinket } from "./trinket-lifecycle";
import { resolveAttackDamage } from "./attack-damage";
import { passiveDamageWounds } from "./passive";
import { gainNegativeQuirk, replaceConditionQuirk } from "./conditions";
import { trinketChoice } from "./trinket-reactions";
import { CORE_TRINKET_BINDINGS } from "../../data/src/core-trinket-bindings";
import type { CoreTrinketId } from "../../data/src/core-trinket-bindings";
import type { GameState, ApplyResult, GameEvent } from "./command";
import { rejectBattleCommand } from "./battle";
import {
  availableTrinket,
  spendTrinket,
  healingTrinketReaction,
  damageTrinketReaction,
} from "./trinket-reactions";
import { triggerBattlePassive } from "./battle-passive";
import { triggerDungeonPassive } from "./dungeon-passive";
import { resolveBattlePressure } from "./pressure";
import { resolveDungeonPressure } from "./dungeon-pressure";
import { resolveSeededHeroHealth } from "./hero-health";
import { passiveHeal } from "./passive";
import { healingForbidden } from "./battle-healing";
import { changeDungeonLight } from "./dungeon-light";
import { dungeonProvisionWindow } from "./dungeon-provision-window";
import { statusProjection } from "./status";
import { finalizeFreeTrinketDuringMonsterTurn } from "./battle-monster-retarget";

export type UseCoreTrinketCommand = {
  readonly type: "useCoreTrinket";
  readonly actorId: string;
  readonly cardId: CoreTrinketId;
};
const freeFaces: Partial<Record<CoreTrinketId, readonly ("upright" | "inverted")[]>> = {
  "trinket:p005": ["inverted"],
  "trinket:p015": ["upright"],
  "trinket:p017": ["upright"],
  "trinket:p018": ["upright"],
  "trinket:p025": ["inverted"],
  "trinket:p027": ["upright", "inverted"],
  "trinket:p028": ["upright"],
  "trinket:p029": ["inverted"],
  "trinket:p030": ["upright", "inverted"],
  "trinket:p035": ["upright"],
  "trinket:p036": ["upright", "inverted"],
  "trinket:p037": ["upright", "inverted"],
  "trinket:p038": ["upright", "inverted"],
};
export function coreTrinketFreeProblem(
  state: GameState,
  actorId: string,
  id: CoreTrinketId,
): string | null {
  const b = state.battle,
    d = state.dungeon,
    scope = b ?? d;
  if (!scope) return "尚未出征";
  if (b) {
    const turn = b.encounter?.turn;
    if (
      !turn ||
      !["hero", "monster"].includes(turn.type) ||
      b.pending ||
      b.skillPrefix ||
      b.shuffleIntents.length ||
      b.shuffleContinuation ||
      (turn.type === "monster" && !b.monsterAction?.positioned)
    )
      return "须在角色回合完整效果之间使用";
  } else if (
    !d ||
    (!(
      d.phase === "inHamlet" &&
      d.hamletReturn?.phase === "complete" &&
      !d.pending &&
      !d.hamlet?.active &&
      !d.deathTrinketChoice &&
      !d.replacementPreparation
    ) &&
      !dungeonProvisionWindow(d)) ||
    d.phase === "returningToHamlet"
  )
    return "须先完成当前地牢效果";
  const hero = b
    ? b.entities.find((h) => h.id === actorId && h.side === "hero")
    : d!.heroes.find((h) => h.id === actorId);
  if (
    !hero ||
    hero.dead ||
    !Number.isSafeInteger(hero.stress) ||
    hero.stress! < 0 ||
    hero.stress! >= 10
  )
    return "持有者状态无效";
  const held = scope.trinkets?.held.find((h) => h.heroId === actorId && h.cardId === id);
  if (!held || !freeFaces[id]?.includes(held.face)) return "此面须在对应触发窗口使用";
  if (b?.usedTrinketIds?.includes(id)) return "本角色回合已使用";
  if (
    !b &&
    d?.phase === "inHamlet" &&
    (id === "trinket:p015" ||
      id === "trinket:p029" ||
      ((id === "trinket:p028" || id === "trinket:p035") && held.face === "upright") ||
      ((id === "trinket:p005" || id === "trinket:p037") && held.face === "inverted"))
  )
    return "村庄没有地牢光照或补给（R-133）";
  const light = b?.light ?? d!.explorationSetup?.light;
  if (
    held.face === "upright" &&
    ((id === "trinket:p028" && light! > 3) || (id === "trinket:p035" && light! < 3))
  )
    return "光照不符合卡面";
  if (
    id === "trinket:p027" &&
    held.face === "upright" &&
    (b?.encounter?.turn.type !== "hero" || b.encounter.turn.actorId !== actorId)
  )
    return "须在持有者自己的回合增加行动";
  if (
    ((id === "trinket:p015" && held.face === "upright") || id === "trinket:p029") &&
    !(b?.provisions ?? d?.explorationSetup?.provisions)?.some((p) => p.face === "food")
  )
    return "需要消耗一颗Food";
  return null;
}
export function coreTrinketFreeActions(state: GameState) {
  const scope = state.battle ?? state.dungeon;
  return (
    scope?.trinkets?.held.flatMap((h) => {
      const id = h.cardId as CoreTrinketId;
      return freeFaces[id]?.includes(h.face)
        ? [
            {
              actorId: h.heroId,
              cardId: id,
              label:
                CORE_TRINKET_BINDINGS[id].name + " · " + (h.face === "upright" ? "正面" : "反面"),
              problem: coreTrinketFreeProblem(state, h.heroId, id),
            },
          ]
        : [];
    }) ?? []
  );
}
export function useCoreTrinket(state: GameState, command: UseCoreTrinketCommand): ApplyResult {
  const { actorId, cardId } = command,
    problem = coreTrinketFreeProblem(state, actorId, cardId);
  if (problem) return rejectBattleCommand(state, problem);
  const scope = state.battle ?? state.dungeon!,
    held = scope.trinkets!.held.find((h) => h.cardId === cardId)!;
  if (!availableTrinket(scope, actorId, cardId, held.face))
    return rejectBattleCommand(state, "饰品持有或次数已变化");
  const upright = held.face === "upright";
  let current = state;
  const events: GameEvent[] = [];
  const stressMap: Partial<Record<CoreTrinketId, number>> = {
    "trinket:p017": -3,
    "trinket:p018": -2,
    "trinket:p028": -9,
    "trinket:p035": -3,
    "trinket:p036": -4,
  };
  const stress = upright
    ? stressMap[cardId]
    : cardId === "trinket:p030"
      ? 2
      : ["trinket:p025", "trinket:p027"].includes(cardId)
        ? 1
        : undefined;
  if (stress !== undefined) {
    if (current.battle) {
      const r = triggerBattlePassive(current.battle, state.seed, [actorId], {
        type: "stress",
        amount: stress,
      });
      if (r.status === "refused") return rejectBattleCommand(state, r.reason);
      current = { ...current, battle: r.battle };
      events.push(...r.events);
    } else {
      const r = triggerDungeonPassive(current.dungeon!, state.seed, [actorId], {
        type: "stress",
        amount: stress,
      });
      if (r.status === "refused") return rejectBattleCommand(state, r.reason);
      current = { ...current, dungeon: r.dungeon };
      events.push(...r.events);
    }
  }
  if (upright && cardId === "trinket:p027") {
    const b = current.battle!,
      turn = b.encounter!.turn;
    if (turn.type !== "hero") return rejectBattleCommand(state, "没有行动中的英雄");
    current = {
      ...current,
      battle: {
        ...b,
        encounter: { ...b.encounter!, turn: { ...turn, actions: turn.actions + 1 } },
      },
    };
  }
  if (upright && ["trinket:p015", "trinket:p030", "trinket:p037"].includes(cardId)) {
    const b = current.battle,
      d = current.dungeon;
    const heroes = b ? b.entities.filter((h) => h.side === "hero") : d!.heroes;
    const actor = heroes.find((h) => h.id === actorId)!;
    const ids = heroes
      .filter(
        (h) =>
          !h.dead &&
          (cardId === "trinket:p037" && b
            ? "areaId" in h && h.areaId === ("areaId" in actor ? actor.areaId : undefined)
            : cardId === "trinket:p037" || h.id === actorId),
      )
      .map((h) => h.id);
    for (const id of ids) {
      const now = current.battle ?? current.dungeon!,
        hero = ("entities" in now ? now.entities : now.heroes).find((h) => h.id === id)!;
      if (current.battle && healingForbidden(current.battle, id)) {
        events.push({
          type: "healingPrevented",
          entityId: id,
          message: "当前区域禁止治疗（R-067）",
        });
        continue;
      }
      if (hero.life === undefined || hero.wounds === undefined)
        return rejectBattleCommand(state, "治疗缺少已核实生命");
      const amount = healingTrinketReaction(
        now,
        actorId,
        id,
        cardId === "trinket:p015" ? 10 : cardId === "trinket:p030" ? 9 : 6,
      );
      const effect = { type: "heal" as const, amount: passiveHeal(hero, amount) };
      const r = resolveSeededHeroHealth(
        { life: hero.life, wounds: hero.wounds, dead: hero.dead ?? false },
        effect,
        state.seed,
        "entities" in now ? now.rngCursor : now.cursor,
      );
      if (r.status !== "resolved") return rejectBattleCommand(state, "治疗无法结算");
      if (current.battle)
        current = {
          ...current,
          battle: {
            ...current.battle,
            rngCursor: r.rngCursor,
            entities: current.battle.entities.map((h) => (h.id === id ? { ...h, ...r.state } : h)),
          },
        };
      else
        current = {
          ...current,
          dungeon: {
            ...current.dungeon!,
            cursor: r.rngCursor,
            heroes: current.dungeon!.heroes.map((h) =>
              h.id === id
                ? {
                    ...h,
                    ...r.state,
                    ...(h.combat ? { combat: { ...h.combat, wounds: r.state.wounds } } : {}),
                  }
                : h,
            ),
          },
        };
      events.push({
        type: "heroHealthResolved",
        entityId: id,
        effect,
        resolution: r,
        message: "饰品治疗（R26、R29）",
      });
    }
  }
  if (cardId === "trinket:p029" || (upright && cardId === "trinket:p015")) {
    if (current.battle) {
      const pool = current.battle.provisions!,
        food = pool.find((p) => p.face === "food")!;
      current = {
        ...current,
        battle: { ...current.battle, provisions: pool.filter((p) => p.id !== food.id) },
      };
    } else {
      const d = current.dungeon!,
        setup = d.explorationSetup!,
        food = setup.provisions.find((p) => p.face === "food")!;
      current = {
        ...current,
        dungeon: {
          ...d,
          explorationSetup: {
            ...setup,
            provisions: setup.provisions.filter((p) => p.id !== food.id),
          },
        },
      };
    }
  }
  if ((cardId === "trinket:p005" && !upright) || (cardId === "trinket:p037" && !upright)) {
    const delta = cardId === "trinket:p005" ? 1 : 2;
    if (current.battle) {
      const b = current.battle,
        light = Math.max(0, b.light - delta);
      current = { ...current, battle: { ...b, light } };
      if (light !== b.light) {
        const r = triggerBattlePassive(
          current.battle!,
          state.seed,
          b.entities.filter((h) => h.side === "hero" && !h.dead).map((h) => h.id),
          "lightLowered",
        );
        if (r.status === "refused") return rejectBattleCommand(state, r.reason);
        current = { ...current, battle: r.battle };
        events.push(...r.events);
      }
    } else {
      const changed = changeDungeonLight(
        current,
        Math.max(0, current.dungeon!.explorationSetup!.light - delta),
      );
      if (changed.events.some((e) => e.type === "commandRefused"))
        return rejectBattleCommand(state, "光照无法结算");
      current = changed.state;
      events.push(...changed.events);
    }
  }
  if (cardId === "trinket:p038" && upright) {
    const clear = <
      T extends {
        readonly statusStacks?: readonly import("./status").StatusStack[];
        readonly innateProtection?: boolean;
        readonly combat?: { readonly statusStacks?: readonly import("./status").StatusStack[] };
      },
    >(
      h: T,
    ) => {
      const stacks = h.statusStacks ?? h.combat?.statusStacks;
      if (!stacks) return { ...h, bleed: [], blight: [], debuffStacks: 0, markStacks: 0 };
      const remaining = stacks.filter(
        (s) => !["bleed", "blight", "debuff", "stun", "mark"].includes(s.kind),
      );
      const projection = statusProjection(remaining, h.innateProtection);
      return {
        ...h,
        statusStacks: remaining,
        ...projection,
        ...(h.combat ? { combat: { ...h.combat, statusStacks: remaining, ...projection } } : {}),
      };
    };
    if (current.battle)
      current = {
        ...current,
        battle: {
          ...current.battle,
          entities: current.battle.entities.map((h) =>
            h.side === "hero" && !h.dead ? clear(h) : h,
          ),
        },
      };
    else
      current = {
        ...current,
        dungeon: {
          ...current.dungeon!,
          heroes: current.dungeon!.heroes.map((h) => (!h.dead ? clear(h) : h)),
        },
      };
  }

  if (cardId === "trinket:p036" && !upright) {
    const now = current.battle ?? current.dungeon!,
      hero = ("entities" in now ? now.entities : now.heroes).find((h) => h.id === actorId)!;
    const damage = resolveAttackDamage(hero, 6, false, false).damageDealt;
    const wounds =
      damage > 0 ? damageTrinketReaction(now, actorId, [damage, ...passiveDamageWounds(hero)]) : [];
    if (current.battle) {
      if (wounds.length) {
        const r = triggerBattlePassive(current.battle, state.seed, [actorId], {
          type: "stress",
          amount: 0,
          woundAmounts: wounds,
        });
        if (r.status === "refused") return rejectBattleCommand(state, r.reason);
        current = { ...current, battle: r.battle };
        events.push(...r.events);
      }
      if (damage > 0 && !current.battle!.entities.find((h) => h.id === actorId)!.dead) {
        const r = triggerBattlePassive(current.battle!, state.seed, [actorId], "damageTaken");
        if (r.status === "refused") return rejectBattleCommand(state, r.reason);
        current = { ...current, battle: r.battle };
        events.push(...r.events);
      }
    } else {
      if (wounds.length) {
        const r = triggerDungeonPassive(current.dungeon!, state.seed, [actorId], {
          type: "stress",
          amount: 0,
          woundAmounts: wounds,
        });
        if (r.status === "refused") return rejectBattleCommand(state, r.reason);
        current = { ...current, dungeon: r.dungeon };
        events.push(...r.events);
      }
      if (damage > 0 && !current.dungeon!.heroes.find((h) => h.id === actorId)!.dead) {
        const r = triggerDungeonPassive(current.dungeon!, state.seed, [actorId], "damageTaken");
        if (r.status === "refused") return rejectBattleCommand(state, r.reason);
        current = { ...current, dungeon: r.dungeon };
        events.push(...r.events);
      }
    }
  }
  if (cardId === "trinket:p038" && !upright) {
    if (current.battle) {
      let b = current.battle;
      if (!b.conditions) return rejectBattleCommand(state, "缺少完整怪癖池");
      const r = gainNegativeQuirk(
        b.conditions,
        b.entities.filter((h) => h.side === "hero"),
        actorId,
        state.seed,
        b.rngCursor,
      );
      if (r.status === "refused") return rejectBattleCommand(state, r.reason);
      let pool = r.pool,
        heroes = r.heroes;
      if (r.replaceOptions) {
        const selected = trinketChoice(
          b,
          actorId,
          "cleansing-quirk",
          "第四张怪癖：选择替换的正面怪癖",
          r.replaceOptions.map((id) => ({ id, label: id })),
          true,
        );
        const replaced = replaceConditionQuirk(pool, heroes, selected);
        if (replaced.status === "refused") return rejectBattleCommand(state, replaced.reason);
        pool = replaced.pool;
        heroes = replaced.heroes;
      }
      b = {
        ...b,
        conditions: pool,
        rngCursor: r.cursor,
        entities: b.entities.map((h) => heroes.find((e) => e.id === h.id) ?? h),
      };
      current = { ...current, battle: b };
      events.push({
        type: "passiveTriggered",
        entityId: actorId,
        trigger: "cleansingCrystal",
        message: "Cleansing Crystal：抽负面怪癖 " + r.quirkId,
      });
    } else {
      let d = current.dungeon!;
      if (!d.conditions) return rejectBattleCommand(state, "缺少完整怪癖池");
      const r = gainNegativeQuirk(d.conditions, d.heroes, actorId, state.seed, d.cursor);
      if (r.status === "refused") return rejectBattleCommand(state, r.reason);
      let pool = r.pool,
        heroes = r.heroes;
      if (r.replaceOptions) {
        const selected = trinketChoice(
          d,
          actorId,
          "cleansing-quirk",
          "第四张怪癖：选择替换的正面怪癖",
          r.replaceOptions.map((id) => ({ id, label: id })),
          true,
        );
        const replaced = replaceConditionQuirk(pool, heroes, selected);
        if (replaced.status === "refused") return rejectBattleCommand(state, replaced.reason);
        pool = replaced.pool;
        heroes = replaced.heroes;
      }
      d = { ...d, conditions: pool, cursor: r.cursor, heroes };
      current = { ...current, dungeon: d };
      events.push({
        type: "dungeonUpdated",
        message: "Cleansing Crystal：抽负面怪癖 " + r.quirkId,
      });
    }
  }
  spendTrinket(scope, actorId, cardId);
  if (current.battle) {
    const result = resolveBattlePressure({ state: current, events });
    if (result.events.some((e) => e.type === "commandRefused"))
      return rejectBattleCommand(state, "饰品压力结算拒绝");
    return finalizeFreeTrinketDuringMonsterTurn(
      state,
      result,
      state.battle!,
      (command as UseCoreTrinketCommand & { allTrinkets?: true }).allTrinkets,
    );
  }
  if (current.dungeon!.heroes.some((h) => h.stress === 10 && !h.dead)) {
    const r = resolveDungeonPressure({
      ...current,
      dungeon: {
        ...current.dungeon!,
        freeTrinketResume: {
          phase: current.dungeon!.phase,
          pressureSource: current.dungeon!.pressureSource,
        },
        phase: "blockedPressure",
        pressureSource: "freeTrinket",
      },
    });
    return { ...r, events: [...events, ...r.events] };
  }
  const settled = settleFreeTrinket(current);
  return { ...settled, events: [...events, ...settled.events] };
}
