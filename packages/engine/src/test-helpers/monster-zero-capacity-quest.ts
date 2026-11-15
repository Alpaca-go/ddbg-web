import { applyCommand } from "../command";
import type { QuestStart } from "../../../data/src/quest-save";
import { distance } from "../battle";
import type { Command, GameState } from "../command";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { naturalParty, naturalQuest, CURRENT_WEALD_ROOM_VERSIONS } from "./natural-quest";
import { disinfectionSources as sources } from "./disinfection-quest";
/** 固定已有 seed3 Patrol；采集最短通路必经零容量区的真实怪物移动。 */
export function monsterZeroCapacityQuest() {
  const start: QuestStart = {
    seed: 3,
    questId: "quest:weald:p005",
    mode: "radiant",
    party: naturalParty,
    contentPacks: ["core", "weald"],
    bossEdgeRooms: true,
    stygianRoomRules: "full",
  };
  const initial = createCoreDungeonQuest(
    3,
    start.questId,
    start.mode,
    start.party,
    sources,
    true,
    "full",
    start.contentPacks,
  );
  let previous = initial,
    before: GameState | undefined,
    after: GameState | undefined,
    action: Command | undefined;
  const commands: Command[] = [];
  const moves: string[] = [];
  const run = naturalQuest(3, start.questId, true, sources, 6, {
    continueFrom: initial,
    survival: true,
    handleDeaths: true,
    restThreshold: 0,
    ...CURRENT_WEALD_ROOM_VERSIONS,
    observe(game, c, events = []) {
      for (const e of events) {
        if (e.type !== "monsterPositioned" || e.from === e.to) continue;
        const areas = previous.battle!.areas;
        const zeros = areas.filter((a) => a.zeroCapacity).map((a) => a.id);
        if (!zeros.length) continue;
        moves.push(`${e.from}->${e.to}:${e.steps}`);
        const without = areas
          .filter((a) => !a.zeroCapacity)
          .map((a) => ({ ...a, adjacent: a.adjacent.filter((id) => !zeros.includes(id)) }));
        const detour = distance(without, e.from, e.to);
        if (!zeros.includes(e.to) && (detour === null || detour > e.steps)) {
          before = previous;
          after = game;
          action = c;
          throw new Error("monster zero checkpoint ready");
        }
      }
      commands.push(c);
      previous = game;
    },
  });
  if (!before || !after || !action)
    throw new Error(`缺怪物穿行检查点：${run.stopReason} ${moves.join(",")}`);
  const positioned = after;
  const b = positioned.battle!,
    prepared = b.monsterAction!;
  const skill: Command = {
    type: "playMonsterSkill",
    actorId: prepared.actorId,
    targetId: prepared.targetId,
    skillSlot: prepared.skillSlot,
    toxicMushrooms: true,
    damageStoneWindow: true,
    allTrinkets: true,
  };
  const finished = applyCommand(after, skill);
  if (finished.events.some((e) => e.type === "commandRefused"))
    throw new Error("实际落点技能被拒绝");
  // 独立非法机制夹具：仅把同一怪物移至实际核准零容量区；不冒充自然日志。
  const illegal = b.areas
    .filter((a) => a.zeroCapacity)
    .map((a) => ({
      ...positioned,
      battle: {
        ...b,
        entities: b.entities.map((e) => (e.id === prepared.actorId ? { ...e, areaId: a.id } : e)),
      },
    }))
    .find((game) =>
      applyCommand(game, skill).events.some(
        (e) => e.type === "commandRefused" && e.message.includes("W-03"),
      ),
    );
  if (!illegal) throw new Error("缺可直接命中结束回合守卫的非法机制夹具");
  return {
    start,
    before,
    after,
    action,
    commands,
    sources,
    skill,
    finished: finished.state,
    illegal,
  };
}
