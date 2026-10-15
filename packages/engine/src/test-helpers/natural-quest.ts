import { applyCommand } from "../command";
import type { ApplyResult, Command, GameEvent, GameState, PendingChoice } from "../command";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import type { BasicQuestId } from "../../../data/src/basic-quests";
import { coreParty, coreQuestSources } from "./core-quest";
import { canRestDungeon } from "../dungeon-rest";
import { distance, playHeroSkill } from "../battle";
import { playHeroSkillTargets } from "../battle-hero-targets";
import { moveHero } from "../battle-hero-movement";
import type { PlayHeroSkillCommand } from "../battle";
import type { PlayHeroSkillTargetsCommand } from "../battle-hero-targets";

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
/** 测试用固定决策驱动，不进入产品；只执行公开命令，不修改任何游戏状态／牌序。 */
export function naturalQuest(
  seed: number,
  questId: BasicQuestId,
  keepStop = false,
  sources = coreQuestSources,
  scoutRooms = 2,
) {
  const initial = createCoreDungeonQuest(seed, questId, "radiant", naturalParty, sources);
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
    return r;
  };
  const choice = () => state.battle?.pending?.choice ?? state.dungeon?.pending;
  const choose = (id: string) => {
    const pending = choice();
    if (!pending) throw new Error("missing choice");
    return step({ type: "resolveChoice", choiceId: pending.id, optionId: id });
  };
  const pick = (pending: PendingChoice) => {
    const options = pending.options;
    if (pending.id.startsWith("dungeon-rest:") && options.some((o) => o.id.startsWith("heal:"))) {
      const plan = state.dungeon!.rest!.plan!;
      return [...options].sort((a, b) => {
        const score = (id: string) => {
          const [kind, i] = id.split(":"),
            hero = state.dungeon!.heroes[Number(i)]!,
            spent = plan.spend[Number(i)]!;
          return kind === "heal" ? (hero.wounds! - spent.heal) * 0.7 : hero.stress - spent.stress;
        };
        return score(b.id) - score(a.id);
      })[0]!.id;
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
      ].find((id) => options.some((o) => o.id === id)) ??
      options.find((o) => o.id.startsWith("use:"))?.id ??
      options[0]!.id
    );
  };
  const settle = () => {
    for (let count = 0; count < 200; count++) {
      const p = choice();
      if (p) {
        choose(pick(p));
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
    for (let count = 0; count < 200; count++) {
      settle();
      const b = state.battle!,
        t = b.encounter!.turn;
      if (t.type === "finished") {
        step({ type: "finishDungeonBattle" });
        settle();
        return;
      }
      if (t.type === "halted") throw new Error(`battle halted: ${t.reason}`);
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
          return {
            command,
            r,
            score: r.events.some((e) => e.type === "commandRefused")
              ? -Infinity
              : (t.actions > 1 ? (attacks(r.state)[0]?.score ?? 0) * 0.8 : 0) -
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
  const room = () => {
    for (let count = 0; count < 20; count++) {
      settle();
      const d = state.dungeon!;
      if (d.phase === "ready") return;
      if (d.phase !== "awaitingRoom") throw new Error(`dungeon halted ${d.phase}`);
      const kind = d.rooms.find((r) => r.id === d.position)!.kind;
      if (
        kind === "lair" ||
        kind === "treasure" ||
        (kind === "curio" && d.curioRoom?.stage === "guarded")
      ) {
        step({ type: "prepareDungeonBattle" });
        if (!state.dungeon!.roomCards!.active!.tileId) throw new Error("unready tile");
        step({ type: "prepareDungeonMonsters" });
        step({ type: "startDungeonBattle" });
        fight();
      } else step({ type: "resolveDungeonRoom" });
    }
    throw new Error("room loop");
  };
  try {
    step({ type: "rollDungeonProvisions" });
    settle();
    const route = ["G", "D", "A", "B", "A", "D", "E", "D", "G", "H", "G", "F", "C"];
    for (const to of route) {
      if (state.dungeon!.heroes.some((h) => h.dead)) throw new Error("hero died");
      const visited = state.dungeon!.visited!.includes(to);
      step({ type: visited ? "beginDungeonBacktrack" : "beginDungeonExploration" });
      choose(to);
      if (!visited) step({ type: "rollDungeonExploration" });
      settle();
      room();
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
        questId === "quest:p001"
          ? cleared.length >= scoutRooms && won > 0
          : questId === "quest:p002"
            ? lairs.length > 0
            : lairs.length > 0 && d.gold >= 20;
      if (done) {
        step({ type: "leaveDungeon" });
        choose("agree");
        step({ type: "summarizeDungeonQuest" });
        if (questId === "quest:p003") choose("give:20");
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
