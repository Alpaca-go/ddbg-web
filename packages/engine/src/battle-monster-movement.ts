import { distance, rejectBattleCommand, skillTargetView } from "./battle";
import type { BattleArea } from "./battle";
import type { ApplyResult, GameState } from "./command";
import { applyEncounterCommand } from "./encounter";
import { readPrintedRange, readPrintedTargets } from "./hero-skill";
import { readMonsterAttackView, resolveMonsterSkill } from "./monster-skill";

export type MoveMonsterToRangeCommand = {
  readonly type: "moveMonsterToRange";
  readonly actorId: string;
};
export type MonsterPositionedEvent = {
  readonly type: "monsterPositioned";
  readonly actorId: string;
  readonly targetId: string;
  readonly from: string;
  readonly to: string;
  readonly steps: number;
  readonly skipped: boolean;
  readonly message: string;
};

/** 只投影获批几何；不读取 usable=false 板块的出生 / 交互标记（R-048、R-054）。 */
export function roomTileBattleAreas(tile: {
  readonly geometryVerified: boolean;
  readonly usable?: boolean;
  readonly deployment?:
    | {
        readonly printReview: string;
        readonly markers: readonly {
          readonly areaId: string;
          readonly semantic: string;
          readonly status: string;
        }[];
      }
    | undefined;
  readonly areas: readonly BattleAreaWithoutEdges[];
  readonly edges: readonly {
    readonly from: string;
    readonly to: string;
    readonly blocked: boolean;
    readonly cornerOnly: boolean;
  }[];
}): readonly BattleArea[] {
  if (tile.geometryVerified !== true) throw new Error("房间几何尚未核实（R-048）");
  return tile.areas.map((area) => ({
    ...area,
    ...(tile.usable === true &&
    tile.deployment?.printReview === "verified" &&
    tile.deployment.markers.some(
      (marker) =>
        marker.areaId === area.id &&
        marker.semantic === "cornered" &&
        marker.status === "confirmed",
    )
      ? { endTurnStress: 1 as const }
      : {}),
    adjacent: tile.edges
      .filter(
        (edge) =>
          !edge.blocked && !edge.cornerOnly && (edge.from === area.id || edge.to === area.id),
      )
      .map((edge) => (edge.from === area.id ? edge.to : edge.from))
      .sort(),
  }));
}
type BattleAreaWithoutEdges = Omit<BattleArea, "adjacent">;

/** R18、R24–25；R-021/022/023/024。普通怪按目标区域定位，再攻击或跳过。 */
export function moveMonsterToRange(
  state: GameState,
  command: MoveMonsterToRangeCommand,
  chosenArea?: string,
): ApplyResult {
  const battle = state.battle;
  const action = battle?.monsterAction;
  const turn = battle?.encounter?.turn;
  if (
    !battle ||
    !action ||
    action.actorId !== command.actorId ||
    turn?.type !== "monster" ||
    turn.actorId !== command.actorId
  )
    return rejectBattleCommand(state, "当前怪物回合必须先保存选招与目标");
  if (action.positioned) return rejectBattleCommand(state, "本回合已完成 Speed 定位");
  const actor = battle.entities.find((entity) => entity.id === action.actorId);
  const target = battle.entities.find((entity) => entity.id === action.targetId);
  const card = battle.monsters?.find((card) => card.id === actor?.monsterCardId);
  if (
    !actor ||
    actor.side !== "monster" ||
    actor.dead ||
    actor.stanceSlots !== 1 ||
    !target ||
    target.side !== "hero" ||
    target.dead ||
    !card ||
    actor.life !== card.life
  )
    return rejectBattleCommand(state, "只接已关联卡牌的普通怪与存活英雄目标；不实现大型怪移动");
  const attack = readMonsterAttackView(card, action.skillSlot);
  if (attack.status === "refused") return rejectBattleCommand(state, attack.reason);
  const range = readPrintedRange(attack.view);
  const targets = readPrintedTargets(attack.view);
  if (range.kind !== "exact" || targets.kind !== "exact")
    return rejectBattleCommand(state, "需要已命名整数射程与目标数量；区间射程不接入（R-048）");
  // 复用纯技能校验，不掷骰或写伤害；预设印刷距离只用来排除未知数值 / 不支持效果。
  const probe = resolveMonsterSkill(
    card,
    action.skillSlot,
    {
      actor: {
        id: actor.id,
        wounds: actor.wounds,
        ...(actor.buffStacks === undefined ? {} : { buffStacks: actor.buffStacks }),
        ...(actor.shuffleResist === undefined ? {} : { shuffleResist: actor.shuffleResist }),
      },
      target: skillTargetView(target),
      areaDistance: range.distance,
      light: battle.light,
      shuffleChoice: "push",
      guardedHeroOmitted:
        !target.guard && battle.entities.some((e) => e.side === "hero" && !e.dead && e.guard),
    },
    1,
  );
  if (probe.status === "refused") return rejectBattleCommand(state, probe.reason);
  const heights = { low: 0, normal: 1, high: 2 };
  const targetArea = battle.areas.find((area) => area.id === target.areaId)!;
  const inRange = (area: BattleArea) => {
    const steps = distance(battle.areas, area.id, target.areaId);
    return (
      steps !== null &&
      steps >= range.distance &&
      steps <= range.distance + (heights[area.elevation] > heights[targetArea.elevation] ? 1 : 0)
    );
  };
  const origin = battle.areas.find((area) => area.id === actor.areaId)!;
  const firing = battle.areas.filter(inRange);
  // R-023 补充：与全部几何出手位断开时原地跳过，不造距离或要求无用的 Speed。
  const unreachable =
    !inRange(origin) && !firing.some((area) => distance(battle.areas, origin.id, area.id) !== null);
  let options = [origin.id];
  let skipped = unreachable;
  if (!inRange(origin) && !unreachable) {
    if (!Number.isSafeInteger(card.speed) || card.speed! < 0)
      return rejectBattleCommand(state, "缺少已核实 Speed 非负整数（R-048）");
    const living = battle.entities.filter((entity) => !entity.dead && entity.id !== actor.id);
    if (
      living.some(
        (entity) =>
          entity.side === "monster" && entity.stanceSlots !== 1 && entity.stanceSlots !== 2,
      )
    )
      return rejectBattleCommand(state, "缺少占格数，不能猜容量占用（R-048）");
    const reachable = battle.areas.filter((area) => {
      const steps = distance(battle.areas, origin.id, area.id);
      return steps !== null && steps <= card.speed!;
    });
    if (reachable.some((area) => !Number.isSafeInteger(area.capacity) || area.capacity! < 0))
      return rejectBattleCommand(state, "移动候选区域缺少已核实容量（R-048）");
    // 满员和敌方区域仍可穿过；仅限制最终落点，普通怪占 1 格（R18、R-021）。
    const canEnd = (area: BattleArea) =>
      living
        .filter((entity) => entity.areaId === area.id)
        .reduce((sum, entity) => sum + (entity.side === "hero" ? 1 : entity.stanceSlots!), 0) +
        1 <=
      area.capacity!;
    const legal = reachable.filter(canEnd);
    options = legal.filter(inRange).map((area) => area.id);
    if (options.length === 0) {
      skipped = true;
      // 满员的几何出手位仍参与靠近评分；容量只限制本次最终落点。
      const scored = legal.map((area) => ({
        id: area.id,
        steps: Math.min(
          ...firing.map((goal) => distance(battle.areas, area.id, goal.id) ?? Infinity),
        ),
      }));
      const best = Math.min(...scored.map((area) => area.steps));
      if (!Number.isFinite(best))
        return rejectBattleCommand(state, "没有容量允许的落点，需核对输入状态（R-048）");
      options = scored.filter((area) => area.steps === best).map((area) => area.id);
    }
  }
  options.sort();
  if (chosenArea !== undefined && !options.includes(chosenArea))
    return rejectBattleCommand(state, "选择的怪物移动落点无效");
  if (chosenArea === undefined && options.length > 1) {
    const choice = {
      id: `monster-move:${battle.choiceCursor}`,
      actorId: target.id,
      prompt: skipped ? "选择最接近出手位置的落点，随后跳过" : "选择怪物射程内的合法落点",
      options: options.map((id) => ({ id, label: id })),
    };
    return {
      state: {
        ...state,
        battle: {
          ...battle,
          choiceCursor: battle.choiceCursor + 1,
          pending: { type: "monsterMove", choice },
        },
      },
      events: [],
      pendingChoice: choice,
    };
  }
  const to = chosenArea ?? options[0]!;
  const next: GameState = {
    ...state,
    battle: {
      ...battle,
      pending: null,
      monsterAction: { ...action, positioned: true },
      entities: battle.entities.map((entity) =>
        entity.id === actor.id ? { ...entity, areaId: to } : entity,
      ),
    },
  };
  const event: MonsterPositionedEvent = {
    type: "monsterPositioned",
    actorId: actor.id,
    targetId: target.id,
    from: origin.id,
    to,
    steps: distance(battle.areas, origin.id, to)!,
    skipped,
    message: unreachable
      ? "几何出手位置完全不可达，原地跳过剩余回合（R-023 补充）"
      : skipped
        ? "按 Speed 靠近出手位置并跳过剩余回合"
        : "已按射程完成 Speed 定位",
  };
  if (!skipped) return { state: next, events: [event] };
  const finished = applyEncounterCommand(next, { type: "finishMonsterTurn", actorId: actor.id });
  return { ...finished, events: [event, ...finished.events] };
}
