import type { BattleArea, BattleEntity } from "./battle";
import type { SkillShuffle, SkillStance } from "./hero-skill";

const STANCES: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

export type ShuffleIntent = {
  readonly entityId: string;
  /** 已由技能层处理抗性的距离；此层不再次减距。 */
  readonly move: SkillShuffle;
} & (
  | { readonly relativeToId: string; readonly relativeToAreaId?: never }
  | { readonly relativeToAreaId: string; readonly relativeToId?: never }
);

export type ShuffleResolution =
  | { readonly status: "refused"; readonly reason: string }
  | {
      readonly status: "needsChoice";
      /** 已确定的每步落点；调用方追加一个候选再重算。等待时不写回位置。 */
      readonly path: readonly string[];
      readonly options: readonly string[];
    }
  | {
      readonly status: "resolved";
      readonly entities: readonly BattleEntity[];
      readonly path: readonly string[];
      readonly areaSteps: number;
      readonly stanceSteps: number;
    };

function width(entity: BattleEntity): number | undefined {
  return entity.side === "hero" ? 1 : entity.stanceSlots;
}

function distances(areas: readonly BattleArea[], origin: string): Map<string, number> {
  const result = new Map([[origin, 0]]);
  const queue = [origin];
  for (const id of queue) {
    for (const next of areas.find((area) => area.id === id)!.adjacent) {
      if (!result.has(next)) {
        result.set(next, result.get(id)! + 1);
        queue.push(next);
      }
    }
  }
  return result;
}

/**
 * 解析一条已结算的位移意图（说明书 §6.7–6.8，R21/R24，R-020、R-021）。
 * 调用方按技能阵营把分岔交给相应玩家；这里只返回合法落点，不替玩家选。
 * 纯函数不消费 RNG、不清意图、不做死亡补位、不处理挤占或怪癖。
 */
export function resolveShuffle(
  setup: { readonly entities: readonly BattleEntity[]; readonly areas: readonly BattleArea[] },
  intent: ShuffleIntent,
  choices: readonly string[] = [],
): ShuffleResolution {
  const refuse = (reason: string): ShuffleResolution => ({ status: "refused", reason });
  const { entities, areas } = setup;
  if (
    entities.some((entity) => entity.id === "") ||
    areas.some((area) => area.id === "") ||
    new Set(entities.map((entity) => entity.id)).size !== entities.length ||
    new Set(areas.map((area) => area.id)).size !== areas.length
  )
    return refuse("实体 / 区域 ID 重复");
  const actor = entities.find((entity) => entity.id === intent.entityId);
  const relative = entities.find((entity) => entity.id === intent.relativeToId);
  const relativeAreaId = intent.relativeToAreaId ?? relative?.areaId;
  if (
    (intent.relativeToId !== undefined) === (intent.relativeToAreaId !== undefined) ||
    !relativeAreaId ||
    !areas.some((area) => area.id === relativeAreaId)
  )
    return refuse("须提供唯一且有效的参照角色或区域（R21）");
  // 自身效果先于伤害（R20）；参照目标随后死亡仍有本次技能的区域坐标。
  if (!actor || actor.dead) return refuse("被位移者不存在 / 已死亡");
  const amount = intent.move.distance;
  if (
    !Number.isSafeInteger(amount) ||
    amount < 0 ||
    !["push", "pull"].includes(intent.move.direction)
  )
    return refuse("位移方向或距离无效");
  if (amount === 0) {
    return choices.length > 0
      ? refuse("零距离位移不能指定路径")
      : { status: "resolved", entities, path: [], areaSteps: 0, stanceSteps: 0 };
  }
  for (const area of areas) {
    if (
      !Number.isSafeInteger(area.capacity) ||
      area.capacity! < 0 ||
      new Set(area.adjacent).size !== area.adjacent.length ||
      area.adjacent.some(
        (id) =>
          id === area.id ||
          !areas.some((other) => other.id === id && other.adjacent.includes(area.id)),
      )
    )
      return refuse("区域容量未核实或邻接无效（R-021、R-048）");
  }
  const living = entities.filter((entity) => !entity.dead);
  if (
    living.some(
      (entity) =>
        !areas.some((area) => area.id === entity.areaId) ||
        (width(entity) !== 1 && width(entity) !== 2),
    )
  )
    return refuse("角色区域或占格数未核实（R24、R-048）");

  const peers = living.filter((entity) => entity.side === actor.side);
  const occupied = new Set<number>();
  for (const peer of peers) {
    const start = STANCES.indexOf(peer.stance!);
    if (start < 0 || start + width(peer)! > 4) return refuse("姿态超出轨道 / 未核实");
    for (let slot = start; slot < start + width(peer)!; slot += 1) {
      if (occupied.has(slot)) return refuse("同阵营姿态位重叠");
      occupied.add(slot);
    }
  }
  const start = STANCES.indexOf(actor.stance!);
  const delta = intent.move.direction === "push" ? 1 : -1;
  const destination = Math.max(0, Math.min(4 - width(actor)!, start + delta * amount));
  // 不把另一个大型怪拆成两段；部分重叠的顺移没有明确裁定，保留 Q-19。
  if (
    peers.some(
      (peer) =>
        peer.id !== actor.id &&
        width(peer) === 2 &&
        (delta > 0
          ? destination + width(actor)! === STANCES.indexOf(peer.stance!) + 1
          : destination === STANCES.indexOf(peer.stance!) + 1),
    )
  )
    return refuse("位移终点切入另一大型怪的两格之间，需 Q-19 补充裁定");

  const graph = distances(areas, relativeAreaId);
  if (!graph.has(actor.areaId)) return refuse("被位移者与参照区域不连通");
  let current = actor.areaId;
  const path: string[] = [];
  for (let step = 0; step < amount; step += 1) {
    const candidates = areas
      .find((area) => area.id === current)!
      .adjacent.filter((id) => graph.get(id) === graph.get(current)! + delta)
      .filter((id) => {
        const capacity = areas.find((area) => area.id === id)!.capacity!;
        const load = living
          .filter((entity) => entity.id !== actor.id && entity.areaId === id)
          .reduce((sum, entity) => sum + width(entity)!, 0);
        return load + width(actor)! <= capacity;
      })
      .sort();
    if (candidates.length === 0) break;
    const chosen = choices[step];
    if (chosen !== undefined && !candidates.includes(chosen)) return refuse("选择的位移落点无效");
    if (chosen === undefined && candidates.length > 1)
      return { status: "needsChoice", path, options: candidates };
    current = chosen ?? candidates[0]!;
    path.push(current);
  }
  if (choices.length > path.length) return refuse("位移路径超过距离或截断点");
  return {
    status: "resolved",
    entities: entities.map((entity) => {
      if (entity.id === actor.id)
        return { ...entity, areaId: current, stance: STANCES[destination]! };
      if (entity.dead || entity.side !== actor.side) return entity;
      const position = STANCES.indexOf(entity.stance!);
      const displaced =
        delta > 0
          ? position >= start + width(actor)! && position < destination + width(actor)!
          : position >= destination && position < start;
      return displaced ? { ...entity, stance: STANCES[position - delta * width(actor)!]! } : entity;
    }),
    path,
    areaSteps: path.length,
    stanceSteps: Math.abs(destination - start),
  };
}
