import { applyCommand } from "../command";
import type { ApplyResult, Command, GameEvent, GameState, PendingChoice } from "../command";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { basicQuests } from "../../../data/src/basic-quests";
import type { BasicQuestId } from "../../../data/src/basic-quests";
import { coreParty, coreQuestSources } from "./core-quest";
import { canRestDungeon } from "../dungeon-rest";
import { distance, playHeroSkill } from "../battle";
import { playHeroSkillTargets } from "../battle-hero-targets";
import { moveHero } from "../battle-hero-movement";
import type { PlayHeroSkillCommand } from "../battle";
import type { PlayHeroSkillTargetsCommand } from "../battle-hero-targets";
import { nextNaturalRoute } from "./natural-route";

const equipped = [
  ["hero_skill:p001", "hero_skill:p004", "hero_skill:p016"],
  ["hero_skill:p022", "hero_skill:p031", "hero_skill:p034"],
  ["hero_skill:p064", "hero_skill:p067", "hero_skill:p073"],
  ["hero_skill:p088", "hero_skill:p094", "hero_skill:p097"],
];
export const naturalParty = coreParty.map((hero, index) => ({
  ...hero,
  skillIds: equipped[index]!,
}));
export type NaturalQuestOptions = {
  /** Wipe ‘Em Out：至少清理多少间巢穴才离开（默认 1）。 */
  readonly wipeLairs?: number;
  /** 从已出征状态续跑（awaitingProvisions / ready），不新建任务入口。 */
  readonly continueFrom?: GameState;
  /** 仅记录公开命令的观测点；用于在自然战斗待选/结算处验证日志重放。 */
  readonly observe?: (state: GameState, command: Command) => void;
  /** 自然完成指定场数后按R14提前离开；不伪造任务目标已完成。 */
  readonly exitAfterBattles?: number;
  /**
   * 测试偏好：英雄浪费行动（换姿态）、不求胜，直至 heroesDefeated，
   * 再公开 finishDungeonBattle。仍只走公开命令，不注入 dead:true。
   */
  readonly preferWipeout?: boolean;
};

/** 测试用固定决策驱动，不进入产品；只执行公开命令，不修改任何游戏状态／牌序。 */
export function naturalQuest(
  seed: number,
  questId: BasicQuestId,
  keepStop = false,
  sources = coreQuestSources,
  scoutRooms = 2,
  options: NaturalQuestOptions = {},
) {
  const wipeLairs = options.wipeLairs ?? 1;
  const initial =
    options.continueFrom ?? createCoreDungeonQuest(seed, questId, "radiant", naturalParty, sources);
  let state = initial;
  const commands: Command[] = [],
    events: GameEvent[] = [];
  const step = (command: Command) => {
    const r = applyCommand(state, command);
    const refused = r.events.find((e) => e.type === "commandRefused");
    if (refused) throw new Error(`${command.type}: ${refused.message}`);
    commands.push(command);
    events.push(...r.events);
    state = r.state;
    options.observe?.(state, command);
    return r;
  };
  const choice = () => state.battle?.pending?.choice ?? state.dungeon?.pending;
  const choose = (id: string) => {
    const pending = choice();
    if (!pending) throw new Error("missing choice");
    return step({ type: "resolveChoice", choiceId: pending.id, optionId: id });
  };
  const pick = (pending: PendingChoice) => {
    const choices = pending.options;
    // 全灭偏好：固定首选项，避免智能 pick 改变补给/探索 RNG 导致第4轮撤退而非英雄全灭。
    if (options.preferWipeout) return choices[0]!.id;
    if (pending.id.startsWith("dungeon-rest:") && choices.some((o) => o.id.startsWith("heal:"))) {
      const plan = state.dungeon!.rest!.plan!;
      return [...choices].sort((a, b) => {
        const score = (id: string) => {
          const [kind, i] = id.split(":"),
            hero = state.dungeon!.heroes[Number(i)]!,
            spent = plan.spend[Number(i)]!;
          return kind === "heal" ? (hero.wounds! - spent.heal) * 0.7 : hero.stress - spent.stress;
        };
        return score(b.id) - score(a.id);
      })[0]!.id;
    }
    if (pending.id.startsWith("dungeon-trinket:")) {
      const equip = choices.find((o) => o.id.startsWith("equip:"));
      if (equip) return equip.id;
    }
    return (
      [
        "continue",
        "food",
        "collective",
        "discard-new",
        "gold",
        "pressure",
        "suffer",
        "attack",
        "agree",
        "20",
      ].find((id) => choices.some((o) => o.id === id)) ??
      choices.find((o) => o.id.startsWith("use:"))?.id ??
      choices[0]!.id
    );
  };
  const settle = () => {
    for (let count = 0; count < 200; count++) {
      while (state.dungeon?.deathTrinketChoice)
        step({
          type: "resolveChoice",
          choiceId: state.dungeon.deathTrinketChoice.id,
          optionId: "discard",
        });
      const p = choice();
      if (p) {
        choose(pick(p));
        continue;
      }
      if (state.dungeon?.phase === "blockedPressure") {
        step({ type: "resolveDungeonPressure" });
        continue;
      }
      if (!state.battle && state.dungeon?.phase === "awaitingCurio") {
        step({ type: "resolveDungeonCurio" });
        continue;
      }
      return;
    }
    throw new Error("choice loop");
  };
  const preview = (s: GameState, command: PlayHeroSkillCommand | PlayHeroSkillTargetsCommand) =>
    command.type === "playHeroSkill" ? playHeroSkill(s, command) : playHeroSkillTargets(s, command);
  const score = (s: GameState, r: ApplyResult) => {
    if (r.events.some((e) => e.type === "commandRefused")) return -Infinity;
    let total = 0;
    for (const before of s.battle!.entities) {
      const after = r.state.battle!.entities.find((e) => e.id === before.id)!;
      total +=
        before.side === "monster"
          ? Math.min(after.wounds, after.life!) -
            Math.min(before.wounds, before.life!) +
            (after.dead && !before.dead ? 8 : 0)
          : (before.wounds - after.wounds) * 0.65 - (after.dead && !before.dead ? 1000 : 0);
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
  const fight = () => {
    step({ type: "startBattle" });
    for (let count = 0; count < 500; count++) {
      settle();
      const b = state.battle!,
        t = b.encounter!.turn;
      if (t.type === "finished") {
        if (options.preferWipeout)
          throw new Error(
            `preferWipeout 期望 heroesDefeated，实为 finished/${t.outcome}（第${b.encounter!.round}轮）`,
          );
        step({ type: "finishDungeonBattle" });
        settle();
        return;
      }
      if (t.type === "halted") {
        if (
          options.preferWipeout &&
          (t.reason === "heroesDefeated" || t.reason === "mutualWipeout")
        ) {
          settle();
          step({ type: "finishDungeonBattle" });
          settle();
          return;
        }
        throw new Error(`battle halted: ${t.reason}`);
      }
      if (t.type === "awaitingInitiative") {
        step({ type: "drawInitiative" });
        continue;
      }
      if (b.shuffleIntents.length) {
        step({ type: "resolveShuffles" });
        continue;
      }
      if (t.type === "monster") {
        const action = b.monsterAction;
        if (!action) step({ type: "prepareMonsterAction", actorId: t.actorId });
        else if (!action.positioned) step({ type: "moveMonsterToRange", actorId: t.actorId });
        else
          step({
            type: "playMonsterSkill",
            actorId: t.actorId,
            targetId: action.targetId,
            skillSlot: action.skillSlot,
          });
        continue;
      }
      if (options.preferWipeout) {
        const actor = b.entities.find((e) => e.id === t.actorId)!;
        step({
          type: "changeStance",
          actorId: actor.id,
          direction: actor.stance === "aggressive" ? "backward" : "forward",
        });
        continue;
      }
      const direct = attacks(state)[0];
      if (direct && direct.score > 0) {
        step(direct.command);
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
          return {
            command,
            r,
            score: refused
              ? -Infinity
              : (Number.isFinite(followUp) ? followUp : 0) * 0.8 -
                Math.min(
                  ...b.entities
                    .filter((e) => e.side === "monster" && !e.dead)
                    .map((e) => distance(b.areas, path[path.length - 1]!, e.areaId) ?? 100),
                ) *
                  0.01,
          };
        })
        .sort((a, b) => b.score - a.score);
      if (moves[0] && Number.isFinite(moves[0].score)) {
        step(moves[0].command);
        continue;
      }
      step({
        type: "changeStance",
        actorId: actor.id,
        direction: actor.stance === "aggressive" ? "backward" : "forward",
      });
    }
    throw new Error("battle loop");
  };
  /** 经闭包读回 phase，避免 step 重赋值后仍被收窄为 ready。 */
  const dungeonPhase = () => state.dungeon!.phase;
  const room = () => {
    for (let count = 0; count < 20; count++) {
      settle();
      const phase = dungeonPhase();
      if (phase === "ready") return;
      if (options.preferWipeout && phase === "awaitingReplacement") return;
      if (phase !== "awaitingRoom") throw new Error(`dungeon halted ${phase}`);
      const kind = state.dungeon!.rooms.find((r) => r.id === state.dungeon!.position)!.kind;
      if (
        kind === "lair" ||
        kind === "treasure" ||
        kind === "objective" ||
        (kind === "curio" && state.dungeon!.curioRoom?.stage === "guarded")
      ) {
        step({ type: "prepareDungeonBattle" });
        if (!state.dungeon!.roomCards!.active!.tileId) throw new Error("unready tile");
        step({ type: "prepareDungeonMonsters" });
        step({ type: "startDungeonBattle" });
        fight();
        if (options.preferWipeout && dungeonPhase() === "awaitingReplacement") return;
        if (kind === "objective") {
          for (let i = 0; i < 10; i++) {
            const roomState = state.dungeon!.rooms.find((r) => r.id === state.dungeon!.position)!;
            if (roomState.cleared || dungeonPhase() !== "awaitingRoom") break;
            step({ type: "resolveDungeonRoom" });
            settle();
          }
        }
      } else step({ type: "resolveDungeonRoom" });
    }
    throw new Error("room loop");
  };
  try {
    const activeQuestId = (state.dungeon!.questDistribution?.questId ?? questId) as BasicQuestId;
    const activeQuest = basicQuests.find((q) => q.id === activeQuestId)!;
    if (dungeonPhase() === "awaitingProvisions") {
      step({ type: "rollDungeonProvisions" });
      settle();
    } else if (dungeonPhase() !== "ready") {
      throw new Error(`unexpected dungeon phase ${dungeonPhase()}`);
    }
    for (let hops = 0; hops < state.dungeon!.layout.nodes.length ** 2; hops++) {
      if (options.preferWipeout && dungeonPhase() === "awaitingReplacement")
        return { initial, state, commands, events, stopReason: null };
      if (state.dungeon!.heroes.some((h) => h.dead)) throw new Error("hero died");
      const route = nextNaturalRoute(state.dungeon!);
      if (!route) break;
      step({ type: route.backtrack ? "beginDungeonBacktrack" : "beginDungeonExploration" });
      choose(route.to);
      if (!route.backtrack) step({ type: "rollDungeonExploration" });
      settle();
      room();
      if (options.preferWipeout && dungeonPhase() === "awaitingReplacement")
        return { initial, state, commands, events, stopReason: null };
      const d = state.dungeon!;
      if (canRestDungeon(state) && d.heroes.reduce((n, h) => n + h.stress + h.wounds!, 0) > 12) {
        step({ type: "restDungeon" });
        settle();
      }
      const won = events.filter(
        (e) => e.type === "battleFinished" && e.outcome === "victory",
      ).length;
      const cleared = d.rooms.filter((r) => r.cleared),
        lairs = cleared.filter((r) => r.kind === "lair");
      const done =
        options.exitAfterBattles !== undefined
          ? events.filter((e) => e.type === "battleFinished").length >= options.exitAfterBattles
          : activeQuest.xpKind === "all"
            ? cleared.length >= scoutRooms && won > 0
            : activeQuest.xpKind === "lair"
              ? lairs.length >= wipeLairs
              : activeQuest.xpKind === "objective"
                ? cleared.filter((r) => r.kind === "objective").length >= 1
                : activeQuest.xpKind === "curio"
                  ? cleared.filter((r) => r.kind === "curio").length >= 1
                  : lairs.length > 0 && d.gold >= 20;
      if (done) {
        step({ type: "leaveDungeon" });
        choose("agree");
        step({ type: "summarizeDungeonQuest" });
        if (
          activeQuestId === "quest:p003" &&
          state.dungeon!.pending?.id.startsWith("dungeon-fundraiser:")
        ) {
          const options = state.dungeon!.pending!.options;
          // 提前退出时可能不足20金；只从引擎实际提供的捐献选项中选择。
          choose(options.some((option) => option.id === "give:20") ? "give:20" : options[0]!.id);
        }
        return { initial, state, commands, events, stopReason: null };
      }
    }
    throw new Error("route exhausted");
  } catch (error) {
    if (keepStop)
      return {
        initial,
        state,
        commands,
        events,
        stopReason: error instanceof Error ? error.message : String(error),
      };
    throw error;
  }
}
