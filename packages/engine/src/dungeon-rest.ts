import { restPoints, scoutRestSchema } from "../../data/src/scout-rest";
import type { ScoutRest } from "../../data/src/scout-rest";
import type { ApplyResult, GameState, PendingChoice } from "./command";
import type { DungeonState } from "./dungeon";
import { readDungeonQuestProgress } from "./dungeon-quest";
import { resolveHeroHealth } from "./hero-health";
import { hasQuirk } from "./passive";

function restContext(state: GameState): DungeonState | null {
  const d = state.dungeon;
  if (
    !d ||
    state.battle ||
    d.phase !== "ready" ||
    d.questSummary ||
    d.mustLeaveRoomId === d.position ||
    !scoutRestSchema.safeParse(d.rest).success ||
    d.rest!.used ||
    d.heroes.length !== 4 ||
    new Set(d.heroes.map((h) => h.id)).size !== 4 ||
    d.heroes.some(
      (h) =>
        h.dead ||
        h.attributesVerified !== true ||
        !Number.isSafeInteger(h.stress) ||
        h.stress < 0 ||
        h.stress > 9 ||
        resolveHeroHealth(
          { life: h.life!, wounds: h.wounds!, dead: false },
          { type: "heal", amount: 0 },
        ).status !== "resolved",
    )
  )
    return null;
  const progress = readDungeonQuestProgress(d);
  if (
    progress.status !== "matched" ||
    progress.quest.id !== d.rest!.questId ||
    !progress.clearedRoomIds.includes(d.position)
  )
    return null;
  if (d.rest!.plan && d.rest!.plan.spend.some((s, i) => s.heroId !== d.heroes[i]!.id)) return null;
  return d;
}
export function canRestDungeon(state: GameState): boolean {
  const d = restContext(state);
  return !!d && !d.pending && !d.rest!.plan;
}
function allocate(d: DungeonState, rest: ScoutRest): PendingChoice {
  const plan = rest.plan!;
  const spent = plan.spend.reduce((n, s) => n + s.heal + s.stress, 0);
  const actor =
    plan.mode === "equal"
      ? plan.spend.find((s) => s.heal + s.stress < restPoints(rest.questId) / 4)!.heroId
      : undefined;
  return {
    id: `dungeon-rest:${d.decision}`,
    prompt: `分配休息点：剩余 ${restPoints(rest.questId) - spent} / ${restPoints(rest.questId)}${actor ? `；${actor} 自选用途（每人${restPoints(rest.questId) / 4}点）` : "；全队共同分配"}，分配完成后恢复并弃柴火（R15）`,
    ...(actor ? { actorId: actor } : {}),
    options: d.heroes.flatMap((h, i) =>
      actor && h.id !== actor
        ? []
        : [
            { id: `heal:${i}`, label: `${h.id}：1点恢复Life` },
            { id: `stress:${i}`, label: `${h.id}：1点恢复压力` },
          ],
    ),
  };
}
export function restDungeon(
  state: GameState,
  command:
    | { readonly type: "restDungeon" }
    | { readonly type: "resolveChoice"; readonly choiceId: string; readonly optionId: string },
): ApplyResult {
  const d = restContext(state);
  const refuse = (message: string): ApplyResult => ({
    state,
    events: [{ type: "commandRefused", message }],
  });
  if (!d)
    return refuse("休息须有当前任务的已核实柴火、四名存活英雄与已清理房间；先完成当前结算（R15）");
  const finish = (
    rest: ScoutRest,
    pending: PendingChoice | null,
    message: string,
  ): ApplyResult => ({
    state: { ...state, dungeon: { ...d, rest, pending, decision: d.decision + 1 } },
    events: [{ type: "dungeonUpdated", message }],
    ...(pending ? { pendingChoice: pending } : {}),
  });
  if (command.type === "restDungeon") {
    if (!canRestDungeon(state)) return refuse("请先完成当前决定；不能重新开始休息");
    return finish(
      d.rest!,
      {
        id: `dungeon-rest:${d.decision}`,
        prompt: "全员是否同意休息（R15）？",
        options: [
          { id: "collective", label: "全员同意休息，共同分配" },
          {
            id: "equal",
            label: `全员同意休息，分配意见不一：每人${restPoints(d.rest!.questId) / 4}点`,
          },
          { id: "decline", label: "取消休息" },
        ],
      },
      "等待全员同意休息；尚未消耗柴火",
    );
  }
  if (
    !d.pending?.id.startsWith("dungeon-rest:") ||
    d.pending.id !== command.choiceId ||
    !d.pending.options.some((o) => o.id === command.optionId)
  )
    return refuse("休息选择无效或已过期");
  if (!d.rest!.plan) {
    if (command.optionId === "decline") return finish(d.rest!, null, "取消休息，保留柴火");
    if (command.optionId !== "collective" && command.optionId !== "equal")
      return refuse("休息分配模式无效");
    const rest: ScoutRest = {
      ...d.rest!,
      plan: {
        mode: command.optionId,
        spend: d.heroes.map((h) => ({ heroId: h.id, heal: 0, stress: 0 })),
      },
    };
    return finish(
      rest,
      allocate(d, rest),
      `已同意休息；等待分配${restPoints(rest.questId)}点，尚未恢复或消耗柴火`,
    );
  }
  if (!allocate(d, d.rest!).options.some((o) => o.id === command.optionId))
    return refuse("分配对象 / 均分额度无效");
  const [kind, index] = command.optionId.split(":") as ["heal" | "stress", string];
  const hero = d.heroes[Number(index)]!;
  if (
    (kind === "heal" && (hasQuirk(hero, "Fast Healer") || hasQuirk(hero, "Infirm"))) ||
    (kind === "stress" && hasQuirk(hero, "Resilient"))
  )
    return refuse("休息点触发治疗 / 压力恢复怪癖的事件分组待Q-69确认；未分配此点");
  const plan = {
    ...d.rest!.plan,
    spend: d.rest!.plan.spend.map((s, i) =>
      i === Number(index) ? { ...s, [kind]: s[kind] + 1 } : s,
    ),
  };
  if (
    plan.spend.some(
      (s, i) =>
        (s.heal > 0 &&
          (hasQuirk(d.heroes[i]!, "Fast Healer") || hasQuirk(d.heroes[i]!, "Infirm"))) ||
        (s.stress > 0 && hasQuirk(d.heroes[i]!, "Resilient")),
    )
  )
    return refuse("已分配恢复涉及Q-69怪癖，整次保留原状态");
  const rest = { ...d.rest!, plan };
  if (plan.spend.reduce((n, s) => n + s.heal + s.stress, 0) < restPoints(rest.questId))
    return finish(rest, allocate(d, rest), "已记录分配；全部休息点分配完成前不恢复英雄");
  const heroes: DungeonState["heroes"][number][] = [];
  for (const [i, h] of d.heroes.entries()) {
    const s = plan.spend[i]!;
    const health = resolveHeroHealth(
      { life: h.life!, wounds: h.wounds!, dead: false },
      { type: "heal", amount: s.heal },
    );
    if (health.status !== "resolved") return refuse("英雄恢复校验失败，未消耗柴火");
    const stress = Math.max(0, h.stress - s.stress);
    heroes.push({
      ...h,
      wounds: health.state.wounds,
      stress,
      ...(h.combat ? { combat: { ...h.combat, wounds: health.state.wounds, stress } } : {}),
    });
  }
  const result = finish(
    { ...rest, used: true },
    null,
    "休息完成：按分配恢复Life / 压力，弃置柴火（R15）；金币、光照、补给与RNG不变",
  );
  return { ...result, state: { ...result.state, dungeon: { ...result.state.dungeon!, heroes } } };
}
