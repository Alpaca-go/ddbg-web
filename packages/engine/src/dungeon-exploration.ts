import die from "../../data/normalized/corebox/exploration_die.json";
import { explorationDieSchema } from "../../data/src/exploration";
import type { ApplyResult, GameState } from "./command";
import type { DungeonCommand, DungeonState } from "./dungeon";
import { createRng } from "./rng";
import { resolveDungeonPressure } from "./dungeon-pressure";
import { drawDungeonCurio } from "./dungeon-curio";
import { triggerDungeonPassive } from "./dungeon-passive";
import { resolveDungeonTrap } from "./dungeon-trap";
import { changeDungeonLight } from "./dungeon-light";

const faces = explorationDieSchema.parse(die).faces;
const stances = ["aggressive", "defensive", "ranged", "support"] as const;
const faceLabels = {
  curio: "Curio",
  rubble: "Rubble",
  hunger: "Hunger",
  blank: "空白",
  trap: "Trap",
  darkness: "Stressful Darkness",
};
const finish = (state: GameState, dungeon: DungeonState, message: string): ApplyResult => ({
  state: { ...state, dungeon },
  events: [{ type: "dungeonUpdated", message }],
  ...(dungeon.pending ? { pendingChoice: dungeon.pending } : {}),
});
const refuse = (state: GameState, message: string): ApplyResult => ({
  state,
  events: [{ type: "commandRefused", message }],
});

/** R14：已完成骰面不会因压力恢复而重掷；只在剩余骰面为空后移动。 */
export function continueDungeonExploration(result: ApplyResult): ApplyResult {
  const d = result.state.dungeon;
  if (!d || d.phase !== "awaitingHazards" || !d.exploration?.rolls || d.pending) return result;
  if (d.pendingCurioDraw && !d.heroes.some((h) => h.dead)) {
    const drawn = drawDungeonCurio(
      result.state,
      d.pendingCurioDraw.rollId,
      d.pendingCurioDraw.optionId,
    );
    return { ...drawn, events: [...result.events, ...drawn.events] };
  }
  let next: ApplyResult;
  if (d.heroes.some((h) => h.dead)) {
    next = finish(
      result.state,
      { ...d, phase: "awaitingReplacement" },
      "英雄死亡：等待替换接口，队伍尚未移动（R9）",
    );
  } else {
    const remaining = d.exploration.rolls.filter((r) => !r.resolved);
    const first = remaining[0];
    if (first) {
      next = finish(
        result.state,
        {
          ...d,
          decision: d.decision + 1,
          pending: {
            id: `dungeon-die:${d.decision}`,
            prompt: `${first.heroId}：选择自己的探索骰结算先后（R14）`,
            options: remaining
              .filter((r) => r.heroId === first.heroId)
              .map((r) => ({ id: r.id, label: `${r.id} · ${faceLabels[r.face]}` })),
          },
        },
        "按 Aggressive → Defensive → Ranged → Support 结算",
      );
    } else {
      const to = d.exploration.to;
      const room = d.rooms.find((r) => r.id === to);
      const cleared = room?.cleared || room?.kind === "empty";
      next = finish(
        result.state,
        {
          ...d,
          position: to,
          mustLeaveRoomId: undefined,
          pending: null,
          visited: [...(d.visited ?? [d.exploration.from]), to],
          traversedCorridors: [...(d.traversedCorridors ?? []), [d.exploration.from, to]],
          rooms: d.rooms.map((r) =>
            r.id === to ? { ...r, revealed: true, ...(cleared ? { cleared: true } : {}) } : r,
          ),
          phase: !room || cleared ? "ready" : "awaitingRoom",
        },
        cleared
          ? `进入 ${to}：Empty 自动清理，移除房间代币（R15）`
          : room
            ? `进入 ${to}：等待 ${room.kind} 房间效果，未清理代币`
            : `停在灰点 ${to}，下一段须再次探索，不能侦察（R14）`,
      );
    }
  }
  return { ...next, events: [...result.events, ...next.events] };
}

/** R14 / R-002：所有合法光照下按当前骰面结算，未裁定组合保持停点。 */
export function applyDungeonExploration(
  state: GameState,
  command:
    | DungeonCommand
    | { readonly type: "resolveChoice"; readonly choiceId: string; readonly optionId: string },
): ApplyResult {
  const d = state.dungeon!;
  const e = d.exploration;
  if (d.phase !== "awaitingHazards" || !e) return refuse(state, "当前没有待结算的走廊");
  if (command.type === "rollDungeonExploration") {
    if (e.rolls || d.pending) return refuse(state, "探索骰已经掷出，不能重掷");
    const config = d.explorationSetup;
    if (
      e.dicePerHero > 0 &&
      (!config ||
        !Number.isInteger(config.dungeonLevel) ||
        config.dungeonLevel < 1 ||
        config.dungeonLevel > 3 ||
        !Number.isInteger(config.light) ||
        config.light < 0 ||
        config.light > 5 ||
        config.provisions.length > 16 ||
        new Set(config.provisions.map((p) => p.id)).size !== config.provisions.length ||
        config.provisions.some((p) => !p.id || !["food", "torch", "tool"].includes(p.face)) ||
        new Set(d.heroes.map((h) => h.stance)).size !== d.heroes.length ||
        d.heroes.some(
          (h) =>
            h.dead ||
            !stances.includes(h.stance!) ||
            h.attributesVerified !== true ||
            !Number.isInteger(h.level) ||
            h.level! < 1 ||
            h.level! > 3 ||
            !Number.isInteger(h.life) ||
            h.life! < 1 ||
            !Number.isInteger(h.wounds) ||
            h.wounds! < 0 ||
            h.wounds! > h.life!,
        ))
    )
      return refuse(state, "需要已核实 HL / Life / 伤口、唯一姿态、DL、光照 0–5 与补给（R-048）");
    const rng = createRng(state.seed);
    for (let i = 0; i < d.cursor; i++) rng.next();
    const heroes = [...d.heroes].sort(
      (a, b) => stances.indexOf(a.stance!) - stances.indexOf(b.stance!),
    );
    const rolls = heroes.flatMap((h) =>
      Array.from({ length: e.dicePerHero }, (_, i) => ({
        id: `${h.id}:${i + 1}`,
        heroId: h.id,
        face: faces[Math.floor(rng.next() * 6)]!,
        resolved: false,
      })),
    );
    let rolled: DungeonState = {
      ...d,
      cursor: d.cursor + rolls.length,
      exploration: { ...e, rolls },
    };
    const passiveEvents: import("./command").GameEvent[] = [];
    for (const roll of rolls.filter((r) => r.face === "curio")) {
      const passive = triggerDungeonPassive(rolled, state.seed, [roll.heroId], "curioRolled");
      if (passive.status === "refused") return refuse(state, passive.reason);
      rolled = passive.dungeon;
      passiveEvents.push(...passive.events);
    }
    const continued = continueDungeonExploration(
      finish(
        state,
        rolled,
        rolls.length
          ? `探索骰：${rolls.map((r) => `${r.id} ${faceLabels[r.face]}`).join("；")}`
          : "侦察后的 Radiant：每人 0 骰，不消耗 RNG（R-013）",
      ),
    );
    return { ...continued, events: [...passiveEvents, ...continued.events] };
  }
  if (
    command.type !== "resolveChoice" ||
    !d.pending ||
    command.choiceId !== d.pending.id ||
    !d.pending.options.some((o) => o.id === command.optionId)
  )
    return refuse(state, "选择不存在、已过期或无效");
  const rolls = e.rolls!;
  if (d.pending.id.startsWith("dungeon-die:")) {
    const roll = rolls.find((r) => r.id === command.optionId)!;
    if (roll.face === "blank")
      return complete(state, d, roll.id, "空白：无事发生，不触发 Curio（R-012）");
    const required =
      roll.face === "hunger"
        ? "food"
        : roll.face === "darkness" || roll.face === "curio"
          ? "torch"
          : "tool";
    const options = d
      .explorationSetup!.provisions.filter((p) => p.face === required)
      .map((p) => ({
        id: `use:${p.id}`,
        label: `使用 ${p.face}（${p.id}）${roll.face === "curio" ? "，抽卡前抑制负面效果" : "抵消"}`,
      }));
    if (roll.face === "hunger") options.push({ id: "suffer", label: "承受 2 × HL 伤口" });
    if (roll.face === "rubble") options.push({ id: "suffer", label: "承受 DL 伤口和 1 压力" });
    if (roll.face === "darkness")
      options.push({ id: "suffer", label: "承受 2 压力" }, { id: "light", label: "光照 −1" });
    if (roll.face === "trap") options.push({ id: "attack", label: "陷阱攻击" });
    if (roll.face === "curio") options.push({ id: "draw", label: "不用 Torch，抽 Curio" });
    return finish(
      state,
      {
        ...d,
        decision: d.decision + 1,
        pending: {
          id: `dungeon-hazard:${d.decision}:${roll.id}`,
          prompt: `${roll.heroId} · ${faceLabels[roll.face]}`,
          options,
        },
      },
      "等待本英雄危险结算选择",
    );
  }
  const roll = rolls.find((r) => d.pending!.id.endsWith(`:${r.id}`) && !r.resolved);
  if (!roll) return refuse(state, "危险结算状态无效");
  if (roll.face === "curio") return drawDungeonCurio(state, roll.id, command.optionId);
  if (command.optionId === "attack") return resolveDungeonTrap(state, roll.id, roll.heroId);
  if (command.optionId === "light") {
    const changed = changeDungeonLight(state, Math.max(0, d.explorationSetup!.light - 1));
    const rejected = changed.events.find((event) => event.type === "commandRefused");
    if (rejected) return refuse(state, rejected.message);
    const completed = complete(
      state,
      changed.state.dungeon!,
      roll.id,
      `${roll.heroId} Stressful Darkness：选择光照 −1，不承受基础 2 压力（R14）`,
    );
    return { ...completed, events: [...changed.events, ...completed.events] };
  }
  if (command.optionId.startsWith("use:")) {
    const id = command.optionId.slice(4);
    const consumed = d.explorationSetup!.provisions.find((p) => p.id === id)!;
    let paid: DungeonState = {
      ...d,
      explorationSetup: {
        ...d.explorationSetup!,
        provisions: d.explorationSetup!.provisions.filter((p) => p.id !== id),
      },
    };
    const events: import("./command").GameEvent[] = [];
    for (const trigger of [
      ...(consumed.face === "food" ? ["foodConsumed" as const] : []),
      ...(roll.face === "hunger"
        ? ["hungerResolved" as const]
        : roll.face === "rubble"
          ? ["rubbleResolved" as const]
          : []),
    ]) {
      const passive = triggerDungeonPassive(paid, state.seed, [roll.heroId], trigger);
      if (passive.status === "refused") return refuse(state, passive.reason);
      paid = passive.dungeon;
      events.push(...passive.events);
    }
    const completed = complete(
      state,
      paid,
      roll.id,
      `${roll.heroId} 使用补给抵消 ${faceLabels[roll.face]}；弃掉 ${id}（R12、R14）`,
    );
    return { ...completed, events: [...events, ...completed.events] };
  }
  const hero = d.heroes.find((h) => h.id === roll.heroId)!;
  let changed = d;
  const wounds =
    roll.face === "hunger"
      ? 2 * hero.level!
      : roll.face === "rubble"
        ? d.explorationSetup!.dungeonLevel
        : 0;
  let message = `${hero.id} 承受 ${wounds} 伤口`;
  const stress = roll.face === "rubble" ? 1 : roll.face === "darkness" ? 2 : 0;
  const passiveEvents: import("./command").GameEvent[] = [];
  if ((stress || wounds) && !changed.heroes.find((h) => h.id === hero.id)!.dead) {
    const passive = triggerDungeonPassive(changed, state.seed, [hero.id], {
      type: "stress",
      amount: stress,
      ...(wounds ? { woundAmounts: [wounds] } : {}),
    });
    if (passive.status === "refused") return refuse(state, passive.reason);
    changed = passive.dungeon;
    passiveEvents.push(...passive.events);
    if (stress)
      message += `、基础 ${stress} 压力（光照 ${d.explorationSetup!.light}，按 R-002 修正）`;
  }
  if (roll.face === "rubble" || roll.face === "hunger") {
    const passive = triggerDungeonPassive(
      changed,
      state.seed,
      [hero.id],
      roll.face === "rubble" ? "rubbleResolved" : "hungerResolved",
    );
    if (passive.status === "refused") return refuse(state, passive.reason);
    changed = passive.dungeon;
    passiveEvents.push(...passive.events);
  }
  const completed = complete(state, changed, roll.id, message);
  return { ...completed, events: [...passiveEvents, ...completed.events] };
}

export function completeDungeonHazard(
  state: GameState,
  d: DungeonState,
  rollId: string,
  message: string,
): ApplyResult {
  const dungeon: DungeonState = {
    ...d,
    pending: null,
    exploration: {
      ...d.exploration!,
      rolls: d.exploration!.rolls!.map((r) => (r.id === rollId ? { ...r, resolved: true } : r)),
    },
  };
  let result = finish(state, dungeon, message);
  if (dungeon.heroes.some((h) => h.stress === 10 && !h.dead)) {
    const pressure = resolveDungeonPressure({
      ...result.state,
      dungeon: { ...dungeon, phase: "blockedPressure", pressureSource: "exploration" },
    });
    result = { ...pressure, events: [...result.events, ...pressure.events] };
  }
  return continueDungeonExploration(result);
}

const complete = completeDungeonHazard;
