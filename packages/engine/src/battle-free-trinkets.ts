import type { GameState, ApplyResult, GameEvent } from "./command";
import type { NormalizedTrinketCard } from "../../data/src/normalize/schema";
import { rejectBattleCommand } from "./battle";
import { triggerBattlePassive } from "./battle-passive";
import { trinketPoolProblem } from "./trinket-acquisition";
import { resolveBattlePressure } from "./pressure";
import { endAfterCasualties, finishTurn, newlyDefeatedIds, removeCasualties } from "./encounter";
import { resolveSeededHeroHealth } from "./hero-health";
import { healingForbidden } from "./battle-healing";
import { passiveHeal } from "./passive";
import { statusProjection } from "./status";

// R26 / §11.2 / R-028；完整印刷 p015/017/018/027/028/030/035–038 逐面绑定。
const definitions = {
  "trinket:p015": {
    name: "Bloodthirst Ring",
    level: 2,
    faces: [
      [["Consume one ", "@food", " and ", "@heal", " 10 ", "@heal"]],
      [["When hit: Suffer 3 ", "@bleed", " 2t"]],
    ],
  },
  "trinket:p017": {
    name: "Book of Holiness",
    level: 2,
    faces: [[["@stress", " -3"]], [["Turn a hit against you into a Crit."]]],
  },
  "trinket:p018": {
    name: "Book of Relaxation",
    level: 2,
    faces: [[["@stress", " -2"]], [["@dodge", " -2"]]],
  },
  "trinket:p027": {
    name: "Berserk Charm",
    level: 3,
    faces: [[["Gain +1 Action"]], [["@stress", " +1"]]],
  },
  "trinket:p028": {
    name: "Dark Crown",
    level: 3,
    faces: [
      [["@stress", " -9 if ", "@light", " ", "@compare_lte", " < 3"]],
      [
        ["When the result is determined,"],
        ["-2 Virtue Chance if ", "@light", " ", "@compare_gte", " < 3"],
      ],
    ],
  },
  "trinket:p030": {
    name: "Recovery Charm",
    level: 3,
    faces: [[["@heal", " ", "@heal", " 9"]], [["@stress", " +2"]]],
  },
  "trinket:p035": {
    name: "Solar Crown",
    level: 3,
    faces: [
      [
        ["@stress", " -3 if 3"],
        ["@compare_lte", " < ", "@light"],
      ],
      [
        ["@compare_gte", " < ", "@light"],
        ["When the result is determined,"],
        ["-2 Virtue Chance if 3"],
      ],
    ],
  },
  "trinket:p036": {
    name: "Book of Sanity",
    level: 3,
    faces: [[["@stress", " -4"]], [["Suffer ", "@damage", " 6"]]],
  },
  "trinket:p037": {
    name: "Candle of Life",
    level: 3,
    faces: [
      [["You and every Hero in"], ["the same Area ", "@heal", " ", "@heal", " 6"]],
      [["@light", " -2"]],
    ],
  },
  "trinket:p038": {
    name: "Cleansing Crystal",
    level: 3,
    faces: [
      [
        [
          "Remove all ",
          "@bleed",
          " , ",
          "@blight",
          " , ",
          "@debuff",
          " , ",
          "@stun",
          " , ",
          "@mark",
        ],
        ["from all Heroes"],
      ],
      [["Gain a ", "@trinket_picture"]],
    ],
  },
} as const;
export type FreeTrinketId = keyof typeof definitions;
export const FREE_TRINKET_IDS = Object.keys(definitions) as FreeTrinketId[];
export function isFreeTrinketId(id: string): id is FreeTrinketId {
  return Object.hasOwn(definitions, id);
}
function matches(card: NormalizedTrinketCard, id: FreeTrinketId) {
  const d = definitions[id];
  return (
    card.name === d.name &&
    card.level === d.level &&
    !card.verification.unverified &&
    [card.upright_half, card.inverted_half].every(
      (h, i) =>
        h.name === d.name &&
        h.level === d.level &&
        h.printed_rotation === (i ? 180 : 0) &&
        h.effect_lines
          .flat()
          .every(
            (s) => s.type === "text" || ["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
          ) &&
        JSON.stringify(
          h.effect_lines.map((l) => l.map((s) => (s.type === "text" ? s.text : "@" + s.icon.key))),
        ) === JSON.stringify(d.faces[i]),
    )
  );
}
export function freeTrinketUseProblem(
  state: GameState,
  actorId: string,
  id: FreeTrinketId,
): string | null {
  const b = state.battle,
    turn = b?.encounter?.turn;
  if (
    !b ||
    !turn ||
    !["hero", "monster"].includes(turn.type) ||
    (state.dungeon && state.dungeon.phase !== "inBattle") ||
    b.pending ||
    b.skillPrefix ||
    b.shuffleIntents.length ||
    b.shuffleContinuation ||
    (turn.type === "monster" && !b.monsterAction?.positioned)
  )
    return "需要角色回合内完整效果间隙（R26）";
  const actor = b.entities.find((e) => e.id === actorId && e.side === "hero" && !e.dead);
  if (!actor || !Number.isSafeInteger(actor.stress) || actor.stress! < 0 || actor.stress! >= 10)
    return "持有者或压力无效（R-048）";
  const pool = b.trinkets;
  if (!pool) return "缺少饰品牌池";
  const problem = trinketPoolProblem(
    pool,
    b.entities
      .filter((e) => e.side === "hero")
      .map((e) => ({
        id: e.id,
        dead: e.dead,
        ...(e.heroLevel === undefined ? {} : { level: e.heroLevel }),
      })),
  );
  if (problem) return problem;
  const card = pool.cards.find((c) => c.id === id),
    held = pool.held.find((h) => h.cardId === id && h.heroId === actorId);
  if (!card || !matches(card, id)) return "饰品卡面发生变化（R-048）";
  if (!held || b.usedTrinketIds?.includes(id)) return "未持有或本角色回合已使用（R26、R-028）";
  if (held.face === "inverted" && !["trinket:p027", "trinket:p030", "trinket:p037"].includes(id))
    return "此反面所需时点尚未接通（R-048）";
  if (held.face === "upright") {
    if ((id === "trinket:p028" && b.light > 3) || (id === "trinket:p035" && b.light < 3))
      return "光照不满足卡面条件";
    if (id === "trinket:p027" && (turn.type !== "hero" || turn.actorId !== actorId))
      return "只能给当前行动英雄增加行动";
    if (id === "trinket:p015" && !b.provisions?.some((p) => p.face === "food"))
      return "需要消耗一颗食物补给";
  }
  return null;
}
export function useFreeTrinket(
  state: GameState,
  command: { actorId: string; cardId: FreeTrinketId },
): ApplyResult {
  const { actorId, cardId } = command;
  const problem = freeTrinketUseProblem(state, actorId, cardId);
  if (problem) return rejectBattleCommand(state, problem);
  const before = state.battle!,
    turn = before.encounter!.turn;
  let b = before;
  const events: GameEvent[] = [];
  const actor = b.entities.find((e) => e.id === actorId)!;
  const held = b.trinkets!.held.find((h) => h.cardId === cardId)!;
  const upright = held.face === "upright";
  const stresses: Partial<Record<FreeTrinketId, number>> = {
    "trinket:p017": -3,
    "trinket:p018": -2,
    "trinket:p028": -9,
    "trinket:p035": -3,
    "trinket:p036": -4,
  };
  const stress = upright
    ? stresses[cardId]
    : cardId === "trinket:p030"
      ? 2
      : cardId === "trinket:p027"
        ? 1
        : undefined;
  if (stress !== undefined) {
    const paid = triggerBattlePassive(b, state.seed, [actorId], { type: "stress", amount: stress });
    if (paid.status === "refused") return rejectBattleCommand(state, paid.reason);
    b = paid.battle;
    events.push(...paid.events);
  }
  if (upright && cardId === "trinket:p027" && turn.type === "hero")
    b = { ...b, encounter: { ...b.encounter!, turn: { ...turn, actions: turn.actions + 1 } } };
  if (upright && cardId === "trinket:p038")
    b = {
      ...b,
      entities: b.entities.map((e) => {
        if (e.side !== "hero" || e.dead) return e;
        // 只清除卡面指定五种；保留 Protection 等其它状态。
        const stacks = (e.statusStacks ?? []).filter(
          (s) => !["bleed", "blight", "debuff", "stun", "mark"].includes(s.kind),
        );
        return { ...e, statusStacks: stacks, ...statusProjection(stacks, e.innateProtection) };
      }),
    };
  if (upright && ["trinket:p015", "trinket:p030", "trinket:p037"].includes(cardId)) {
    const targets = b.entities.filter(
      (e) =>
        e.side === "hero" &&
        !e.dead &&
        (cardId === "trinket:p037" ? e.areaId === actor.areaId : e.id === actorId),
    );
    for (const hero of targets) {
      if (healingForbidden(b, hero.id)) {
        events.push({
          type: "healingPrevented",
          entityId: hero.id,
          message: "当前区域禁止治疗（R-067）",
        });
        continue;
      }
      if (hero.life === undefined || hero.wounds === undefined)
        return rejectBattleCommand(state, "治疗缺少生命或伤口");
      const effect = {
        type: "heal" as const,
        amount: passiveHeal(
          hero,
          cardId === "trinket:p015" ? 10 : cardId === "trinket:p030" ? 9 : 6,
        ),
      };
      const health = resolveSeededHeroHealth(
        { life: hero.life, wounds: hero.wounds, dead: hero.dead },
        effect,
        state.seed,
        b.rngCursor,
      );
      if (health.status !== "resolved") return rejectBattleCommand(state, "治疗无法结算");
      b = {
        ...b,
        rngCursor: health.rngCursor,
        entities: b.entities.map((e) => (e.id === hero.id ? { ...e, ...health.state } : e)),
      };
      events.push({
        type: "heroHealthResolved",
        entityId: hero.id,
        effect,
        resolution: health,
        message: "饰品治疗（R26、R29）",
      });
    }
    if (cardId === "trinket:p015") {
      const food = b.provisions!.find((p) => p.face === "food")!;
      b = { ...b, provisions: b.provisions!.filter((p) => p.id !== food.id) };
    }
  }
  if (!upright && cardId === "trinket:p037") b = { ...b, light: Math.max(0, b.light - 2) };
  b = {
    ...b,
    usedTrinketIds: [...(b.usedTrinketIds ?? []), cardId],
    trinkets: {
      ...b.trinkets!,
      held: b.trinkets!.held.map((h) =>
        h.cardId === cardId
          ? { ...h, face: upright ? ("inverted" as const) : ("upright" as const) }
          : h,
      ),
    },
  };
  events.push({
    type: "trinketUsed",
    actorId,
    cardId,
    face: held.face,
    message: definitions[cardId].name + "：结算并翻面（R26）",
  });
  const result = resolveBattlePressure({ state: { ...state, battle: b }, events });
  if (result.events.some((e) => e.type === "commandRefused"))
    return rejectBattleCommand(state, "饰品压力结算拒绝");
  if (
    turn.type === "monster" &&
    result.state.battle!.entities.some((e) => e.id === before.monsterAction!.targetId && e.dead) &&
    result.state.battle!.entities.some((e) => e.side === "hero" && !e.dead)
  )
    return rejectBattleCommand(state, "怪物已定目标死亡续接尚未接通");
  const removed = removeCasualties(result, newlyDefeatedIds(before, result.state.battle!.entities));
  const ended = endAfterCasualties(removed);
  if (ended) return ended;
  return turn.type === "hero" &&
    removed.state.battle!.entities.find((e) => e.id === turn.actorId)!.dead
    ? finishTurn(removed.state, turn.actorId, removed.events)
    : removed;
}
