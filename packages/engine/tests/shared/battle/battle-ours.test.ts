import { describe, expect, it } from "vitest";
import { createBattleState, type BattleEntity } from "../../../src/shared/battle/battle";
import { applyCommand, type GameState } from "../../../src/shared/core/command";
import { createLootState, type LootKind } from "../../../src/shared/trinkets/loot";
import { coreQuestSources } from "../../helpers/core-quest";
import { savedCommandSchema } from "../../../../data/src/shared/quest-save";

const card = coreQuestSources.catalog.monsters.find((c) => c.id === "monster_medium:p001")!;
function setup(kind: LootKind = "doubleGold", version = true): GameState {
  const stances = ["aggressive", "defensive", "ranged", "support"] as const;
  const entities: BattleEntity[] = stances.map((stance, i) => ({
    id: `h${i}`,
    side: "hero",
    hero: "CRUSADER",
    areaId: "A",
    stance,
    skillIds: [],
    wounds: 0,
    stress: 0,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  }));
  entities.push(
    ...["A", "B"].map((areaId, i) => ({
      id: `m${i}`,
      side: "monster" as const,
      hero: null,
      monsterCardId: card.id,
      life: card.life,
      areaId,
      stance: stances[i]!,
      stanceSlots: 1 as const,
      skillIds: [],
      wounds: 0,
      dodge: 0,
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    })),
  );
  const pool = createLootState();
  const token = pool.available.find((t) => t.kind === kind)!;
  const base: GameState = {
    ...createBattleState(4, {
      entities,
      monsters: [card],
      skills: [],
      light: 5,
      wealdMechanics: true,
      provisions: [],
      areas: ["A", "B"].map((id) => ({
        id,
        capacity: 8,
        elevation: "normal" as const,
        adjacent: [],
      })),
    }),
    dungeon: {
      phase: "inBattle",
      mode: "radiant",
      heroes: [],
      contentPacks: ["core", "weald"],
      roomCards: { active: { roomId: "R1", cardId: "room:weald:09" } },
    } as unknown as NonNullable<GameState["dungeon"]>,
  };
  const withLoot: GameState = {
    ...base,
    battle: {
      ...base.battle!,
      loot: {
        ...pool,
        available: pool.available.filter((t) => t.id !== token.id),
        placed: [{ ...token, areaId: "A", revealed: false }],
      },
    },
  };
  const started = applyCommand(withLoot, {
    type: "startBattle",
    ...(version ? { wealdOurs: true as const } : {}),
  });
  const refusal = started.events.find((e) => e.type === "commandRefused");
  if (refusal) throw new Error(refusal.message);
  return {
    ...started.state,
    battle: {
      ...started.state.battle!,
      encounter: {
        ...started.state.battle!.encounter!,
        turn: { type: "hero", actorId: "h0", actions: 2, usedSkillIds: [], mustMove: false },
      },
    },
  };
}
const pickup = { type: "interactLoot", actorId: "h0" } as const;
const effects = [
  { kind: "debuff", remaining: 1 },
  { kind: "buff", remaining: 2 },
];
describe("The Clearing / Ours!（R-234／R-238）", () => {
  it("A 区拾箱也影响全房间怪物，两项状态保持独立，不增加奖励骰之外的 RNG", () => {
    const state = setup();
    const result = applyCommand(state, pickup);
    expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    for (const e of result.state.battle!.entities)
      expect(e.statusStacks).toEqual(e.side === "monster" ? effects : undefined);
    expect(
      result.events.filter((e) => e.type === "passiveTriggered" && e.trigger === "ours"),
    ).toHaveLength(1);
    const old = setup("doubleGold", false);
    const legacy = applyCommand(old, pickup);
    expect(legacy.state.battle!.entities.find((e) => e.id === "m0")!.statusStacks).toBeUndefined();
    expect(result.state.battle!.rngCursor).toBe(legacy.state.battle!.rngCursor);
    expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor + 1);
    expect(result.state.battle!.loot!.gold).toBe(legacy.state.battle!.loot!.gold);
  });
  it("奖励待选冻结后 JSON 续接仅成功拾取时触发一次，重复选择拒绝", () => {
    const state = setup("chooseProvision");
    const revealed = applyCommand(state, pickup);
    expect(revealed.pendingChoice).toBeDefined();
    expect(
      revealed.state.battle!.entities.find((e) => e.id === "m0")!.statusStacks,
    ).toBeUndefined();
    const choice = {
      type: "resolveChoice",
      choiceId: revealed.pendingChoice!.id,
      optionId: "food",
    } as const;
    const result = applyCommand(JSON.parse(JSON.stringify(revealed.state)), choice);
    expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    expect(result.state.battle!.entities.find((e) => e.id === "m1")!.statusStacks).toEqual(effects);
    expect(result.state.battle!.provisions).toHaveLength(1);
    expect(result.state.battle!.loot!.claimedIds).toHaveLength(1);
    expect(applyCommand(result.state, choice).state).toBe(result.state);
    expect(applyCommand(revealed.state, { ...choice, optionId: "invalid" }).state).toBe(
      revealed.state,
    );
  });
  it("最后行动拾取先施加状态再结束回合，不重放奖励或触发", () => {
    const base = setup();
    const turn = base.battle!.encounter!.turn;
    if (turn.type !== "hero") throw new Error("缺英雄回合");
    const state = {
      ...base,
      battle: {
        ...base.battle!,
        encounter: { ...base.battle!.encounter!, turn: { ...turn, actions: 1 } },
      },
    };
    const result = applyCommand(state, pickup);
    expect(result.events.filter((e) => e.type === "turnEnded")).toHaveLength(1);
    expect(
      result.events.findIndex((e) => e.type === "passiveTriggered" && e.trigger === "ours"),
    ).toBeLessThan(result.events.findIndex((e) => e.type === "turnEnded"));
    expect(result.state.battle!.entities.find((e) => e.id === "m0")!.statusStacks).toEqual(effects);
  });
  it("缺受益者防御目录整条拾取回滚，奖励／箱子／行动／RNG 保持不变", () => {
    const base = setup();
    const state = {
      ...base,
      battle: {
        ...base.battle!,
        entities: base.battle!.entities.map((e) =>
          e.id === "m1" ? { ...e, monsterCardId: "missing" } : e,
        ),
      },
    };
    const result = applyCommand(state, pickup);
    expect(result.events[0]!.type).toBe("commandRefused");
    expect(result.state).toBe(state);
  });
  it("新开始标记严格解析，不接受错误版本值", () => {
    const command = { type: "startBattle", wealdOurs: true };
    expect(savedCommandSchema.parse(command)).toEqual(command);
    expect(savedCommandSchema.safeParse({ ...command, wealdOurs: false }).success).toBe(false);
  });
});
