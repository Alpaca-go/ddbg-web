import { distance, playHeroSkill } from "../battle";
import { moveHero } from "../battle-hero-movement";
import { playHeroSkillTargets } from "../battle-hero-targets";
import type { PlayHeroSkillCommand } from "../battle";
import type { PlayHeroSkillTargetsCommand } from "../battle-hero-targets";
import type { ApplyResult, Command, GameState } from "../command";
import { templarsProductionCombatActive } from "../boss/templars-i-deploy";
import { livingNecroticFungus } from "../expansions/weald/necrotic-fungus";

export type NaturalBattleDriver = {
  readonly state: () => GameState;
  readonly step: (command: Command) => void;
  readonly settle: () => void;
};

/**
 * 自然任务/最终战共用的战斗策略：从 `startBattle` 开始，直到 `finished` 并 `finishDungeonBattle`。
 * 贪心选择伤害最高的英雄技能；无可用技能时移动/换姿态；怪物回合走 `prepareMonsterAction`。
 * 由 driver 读写状态，便于调用方保留自己的命令日志与严格校验。
 */
export function playNaturalBattle(
  driver: NaturalBattleDriver,
  options: {
    readonly preferWipeout?: boolean;
    readonly survival?: boolean;
    readonly emergencyHeal?: boolean;
    readonly heroAction?: (state: GameState) => Command | undefined;
    readonly fungalResearch?: "retain-one" | "retain-all" | "destroy-all";
  } = {},
): void {
  const survival = options.survival === true;
  const preview = (s: GameState, command: PlayHeroSkillCommand | PlayHeroSkillTargetsCommand) =>
    command.type === "playHeroSkill" ? playHeroSkill(s, command) : playHeroSkillTargets(s, command);
  const score = (s: GameState, r: ApplyResult) => {
    if (r.events.some((e) => e.type === "commandRefused")) return -Infinity;
    let total = 0;
    if (options.fungalResearch) {
      const before = livingNecroticFungus(s.battle!).length;
      const after = livingNecroticFungus(r.state.battle!).length;
      // 独立保全策略：不选择任何会摧毁真菌的技能，包括范围攻击。
      if (options.fungalResearch === "retain-all" && after < before) return -Infinity;
      if (options.fungalResearch === "retain-one" && before > 0 && after === 0) return -Infinity;
      // 具名测试玩家偏好：优先砸毁真菌；保留模式始终留下最后一枚。
      total += (before - after) * 100;
    }
    for (const before of s.battle!.entities) {
      const after = r.state.battle!.entities.find((e) => e.id === before.id)!;
      total +=
        before.side === "monster"
          ? Math.min(after.wounds, after.life!) -
            Math.min(before.wounds, before.life!) +
            (after.dead && !before.dead ? (survival ? 40 : 8) : 0)
          : (before.wounds - after.wounds) * (survival ? 1.6 : 0.65) -
            (after.dead && !before.dead ? (survival ? 3000 : 1000) : 0);
    }
    for (const e of r.events) {
      if (
        (e.type === "heroSkillResolved" || e.type === "heroSkillTargetsResolved") &&
        e.phase === "ownPending"
      )
        total += (e.type === "heroSkillResolved" ? [e.resolution] : e.resolutions).reduce(
          (n, r) => n + (r.damageDealt ?? 0),
          0,
        );
    }
    return total;
  };
  /** 仅 V1 开启：有英雄濒死且行动者带治疗技能时，优先治疗而不是继续贪伤害。 */
  const emergencyHeal = (s: GameState): Command | undefined => {
    const b = s.battle!,
      turn = b.encounter!.turn;
    if (turn.type !== "hero") return;
    const actor = b.entities.find((e) => e.id === turn.actorId)!;
    const living = b.entities.filter((e) => e.side === "hero" && !e.dead);
    const remaining = (e: (typeof living)[number]) => (e.life ?? 0) - (e.wounds ?? 0);
    const target = [...living].sort((a, b) => remaining(a) - remaining(b))[0];
    if (!target || remaining(target) > 6) return;
    let best: PlayHeroSkillCommand | undefined,
      bestGain = 0;
    for (const skillId of actor.skillIds) {
      const skill = b.skills?.find((entry) => entry.id === skillId);
      if (!skill?.verified_target_heal && !skill?.verified_self_heal) continue;
      const selfOnly = !!skill.verified_self_heal && !skill.verified_target_heal;
      const targetId = selfOnly ? actor.id : target.id;
      for (const face of ["front", "back"] as const) {
        const command: PlayHeroSkillCommand = {
          type: "playHeroSkill",
          actorId: actor.id,
          targetId,
          skillId,
          face,
        };
        const previewed = preview(s, command);
        if (previewed.events.some((e) => e.type === "commandRefused")) continue;
        const after = previewed.state.battle!.entities.find((e) => e.id === targetId)!;
        const gain = remaining(target) - remaining(after);
        if (gain > bestGain) {
          bestGain = gain;
          best = command;
        }
      }
    }
    return bestGain > 0 ? best : undefined;
  };

  const attacks = (s: GameState) => {
    const b = s.battle!,
      turn = b.encounter!.turn;
    if (turn.type !== "hero") return [];
    const actor = b.entities.find((e) => e.id === turn.actorId)!;
    const candidates: {
      command: PlayHeroSkillCommand | PlayHeroSkillTargetsCommand;
      score: number;
    }[] = [];
    for (const skillId of actor.skillIds)
      for (const face of ["front", "back"] as const) {
        for (const target of b.entities.filter((e) => !e.dead)) {
          if (options.fungalResearch === "retain-all" && target.necroticFungus) continue;
          const command: PlayHeroSkillCommand = {
            type: "playHeroSkill",
            actorId: actor.id,
            skillId,
            face,
            targetId: target.id,
          };
          const r = preview(s, command);
          candidates.push({ command, score: score(s, r) });
        }
        for (const area of b.areas)
          for (const side of ["hero", "monster"] as const) {
            const ids = b.entities
              .filter((e) => !e.dead && e.areaId === area.id && e.side === side)
              .map((e) => e.id);
            if (ids.length < 2) continue;
            if (
              options.fungalResearch === "retain-all" &&
              b.entities.some((e) => ids.includes(e.id) && e.necroticFungus)
            )
              continue;
            const command: PlayHeroSkillTargetsCommand = {
              type: "playHeroSkillTargets",
              actorId: actor.id,
              skillId,
              targetIds: ids,
            };
            candidates.push({ command, score: score(s, preview(s, command)) });
          }
      }
    return candidates.sort((a, b) => b.score - a.score);
  };

  driver.step({ type: "startBattle" });
  for (let count = 0; count < 500; count++) {
    driver.settle();
    const state = driver.state();
    const b = state.battle!,
      t = b.encounter!.turn;
    if (t.type === "finished") {
      if (options.preferWipeout)
        throw new Error(
          `preferWipeout 期望 heroesDefeated，实为 finished/${t.outcome}（第${b.encounter!.round}轮）`,
        );
      driver.step({ type: "finishDungeonBattle" });
      driver.settle();
      return;
    }
    if (t.type === "halted") {
      if (
        options.preferWipeout &&
        (t.reason === "heroesDefeated" || t.reason === "mutualWipeout")
      ) {
        driver.settle();
        driver.step({ type: "finishDungeonBattle" });
        driver.settle();
        return;
      }
      throw new Error(`battle halted: ${t.reason}`);
    }
    if (t.type === "awaitingInitiative") {
      driver.step({ type: "drawInitiative" });
      continue;
    }
    if (b.shuffleIntents.length) {
      driver.step({ type: "resolveShuffles" });
      continue;
    }
    if (t.type === "monster") {
      const action = b.monsterAction;
      if (!action) driver.step({ type: "prepareMonsterAction", actorId: t.actorId });
      else if (!action.positioned) driver.step({ type: "moveMonsterToRange", actorId: t.actorId });
      else
        driver.step({
          type: "playMonsterSkill",
          actorId: t.actorId,
          targetId: action.targetId,
          skillSlot: action.skillSlot,
        });
      continue;
    }
    const objectiveAction = options.heroAction?.(state);
    if (objectiveAction) {
      driver.step(objectiveAction);
      continue;
    }
    if (options.preferWipeout) {
      const actor = b.entities.find((e) => e.id === t.actorId)!;
      driver.step({
        type: "changeStance",
        actorId: actor.id,
        direction: actor.stance === "aggressive" ? "backward" : "forward",
      });
      continue;
    }
    const emergency = options.emergencyHeal ? emergencyHeal(state) : undefined;
    if (emergency) {
      driver.step(emergency);
      continue;
    }
    const direct = attacks(state)[0];
    if (direct && direct.score > 0) {
      driver.step(direct.command);
      continue;
    }
    const actor = b.entities.find((e) => e.id === t.actorId)!,
      stat = b.heroStats!.find((s) => s.id === actor.heroStatId)!;
    const paths = new Map<string, string[]>([[actor.areaId, []]]);
    for (const [id, path] of paths) {
      if (path.length >= stat.speed!) continue;
      for (const next of b.areas.find((a) => a.id === id)!.adjacent)
        if (!paths.has(next)) paths.set(next, [...path, next]);
    }
    const moves = [...paths.values()]
      .filter((p) => p.length)
      .map((path) => {
        const command = { type: "moveHero" as const, actorId: actor.id, path },
          r = moveHero(state, command);
        const refused = r.events.some((e) => e.type === "commandRefused");
        const followUp = !refused && t.actions > 1 ? (attacks(r.state)[0]?.score ?? 0) : 0;
        const dest = path[path.length - 1]!;
        const spikeEnd =
          templarsProductionCombatActive(state) &&
          !!b.areas.find((a) => a.id === dest)?.templarsSpikes;
        return {
          command,
          r,
          score:
            refused || spikeEnd
              ? -Infinity
              : (Number.isFinite(followUp) ? followUp : 0) * 0.8 -
                Math.min(
                  ...b.entities
                    .filter((e) => e.side === "monster" && !e.dead)
                    .map((e) => distance(b.areas, dest, e.areaId) ?? 100),
                ) *
                  0.01,
        };
      })
      .sort((a, b) => b.score - a.score);
    if (moves[0] && Number.isFinite(moves[0].score)) {
      driver.step(moves[0].command);
      continue;
    }
    driver.step({
      type: "changeStance",
      actorId: actor.id,
      direction: actor.stance === "aggressive" ? "backward" : "forward",
    });
  }
  throw new Error("battle loop");
}
