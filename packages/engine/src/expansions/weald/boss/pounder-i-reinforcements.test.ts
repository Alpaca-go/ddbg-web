import { expect, it } from "vitest";
import coreMedium from "../../../../../data/normalized/corebox/monster_medium.json";
import { savedCommandSchema } from "../../../../../data/src/quest-save";
import type { MonsterCardView } from "../../../monster-skill";
import { createBattleState, type BattleEntity } from "../../../battle";
import { applyCommand, type GameState } from "../../../command";
import { ensurePounderIBossScriptRegistered, POUNDER_I_SCRIPT_ID } from "./pounder-i";
import { pounderIInitialDeployment, createPounderIEntity } from "./pounder-i-projection";

function fixture(extra: readonly BattleEntity[] = []): GameState {
  ensurePounderIBossScriptRegistered();
  const setup = pounderIInitialDeployment();
  const hero: BattleEntity = {
    id: "h",
    side: "hero",
    hero: "CRUSADER",
    areaId: "J",
    stance: "aggressive",
    wounds: 0,
    dodge: 0,
    stress: 0,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  };
  const initial = createBattleState(17, {
    ...setup,
    monsters: [
      ...setup.monsters,
      coreMedium.cards.find((c) => c.id === "monster_medium:p027")! as MonsterCardView,
    ],
    entities: [...setup.entities, hero, ...extra],
    skills: [],
    light: 5,
    wealdMechanics: true,
  });
  return {
    ...initial,
    dungeon: {
      phase: "inBattle",
      contentPacks: ["core", "weald"],
      campaignLevel: 1,
      mode: "standard",
      heroes: [],
      pounderDungeonThreats: true,
      pounderHamletThreats: true,
      questDistribution: { questId: "quest:p019", campaignLevel: 1 },
      activeBossThreatScriptId: POUNDER_I_SCRIPT_ID,
    } as unknown as NonNullable<GameState["dungeon"]>,
    battle: {
      ...initial.battle!,
      encounter: {
        round: 1,
        deck: ["hero"],
        actedIds: [],
        turn: { type: "monster", actorId: "boss:pounder" },
      },
    },
  };
}
const command = { type: "applyPounderIReinforcements", actorId: "boss:pounder" } as const;
const refused = (r: ReturnType<typeof applyCommand>) =>
  r.events.some((e) => e.type === "commandRefused");

it("增援命令可记录为严格JSON命令，不接收任意组成或伪造骰面", () => {
  expect(savedCommandSchema.parse(JSON.parse(JSON.stringify(command)))).toEqual(command);
  expect(savedCommandSchema.safeParse({ ...command, count: 99 }).success).toBe(false);
  expect(savedCommandSchema.safeParse({ ...command, roll: 1 }).success).toBe(false);
});

it("Pounder 不能绕过 Matchman 直接用普通命令炮击", () => {
  const state = fixture();
  const result = applyCommand(state, {
    type: "playMonsterSkill",
    actorId: "boss:pounder",
    targetId: "h",
    skillSlot: 1,
  });
  expect(refused(result)).toBe(true);
  expect(result.state).toEqual(state);
});

it("第三只增援落点损坏时整条命令回滚前两只实体与先攻 RNG", () => {
  const initial = fixture();
  const state = {
    ...initial,
    battle: {
      ...initial.battle!,
      monsterStanceAreas: { ...initial.battle!.monsterStanceAreas!, support: "UNKNOWN" },
    },
  };
  const result = applyCommand(state, command);
  expect(refused(result)).toBe(true);
  expect(result.state).toEqual(state);
});

it("挤占停在第二只召唤，选择续接不重复 Matchman 或先攻；错误选择原子拒绝", () => {
  const hero = fixture().battle!.entities.find((e) => e.side === "hero")!;
  const state = fixture([1, 2].map((i) => ({ ...hero, id: `block${i}`, areaId: "I" })));
  const pending = applyCommand(state, command);
  expect(refused(pending)).toBe(false);
  expect(pending.pendingChoice?.options.length).toBeGreaterThan(1);
  expect(
    pending.state.battle!.entities.filter((e) => e.id.startsWith("pounder-summon:")),
  ).toHaveLength(1);
  expect(pending.state.battle!.rngCursor).toBe(1);
  const invalid = applyCommand(pending.state, {
    type: "resolveChoice",
    choiceId: pending.pendingChoice!.id,
    optionId: "invalid",
  });
  expect(refused(invalid)).toBe(true);
  expect(invalid.state).toEqual(pending.state);
  const optionId = pending.pendingChoice!.options[0]!.id;
  const complete = applyCommand(pending.state, {
    type: "resolveChoice",
    choiceId: pending.pendingChoice!.id,
    optionId,
  });
  expect(complete.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(complete.state.battle!.pending).toBeNull();
  expect(
    complete.state.battle!.entities.filter((e) => e.id.startsWith("pounder-summon:")),
  ).toHaveLength(3);
  expect(complete.state.battle!.rngCursor).toBe(3);
  expect(
    applyCommand(JSON.parse(JSON.stringify(pending.state)) as GameState, {
      type: "resolveChoice",
      choiceId: pending.pendingChoice!.id,
      optionId,
    }),
  ).toEqual(complete);
  expect(complete.state.battle!.encounter!.deck.filter((s) => s === "monster")).toHaveLength(3);
  expect(
    applyCommand(pending.state, {
      type: "resolveChoice",
      choiceId: pending.pendingChoice!.id,
      optionId,
    }),
  ).toEqual(complete);
  const repeated = applyCommand(complete.state, {
    type: "resolveChoice",
    choiceId: pending.pendingChoice!.id,
    optionId,
  });
  expect(refused(repeated)).toBe(true);
  expect(repeated.state).toEqual(complete.state);
});

it("R-258／R31 真实三只增援逐只占首空姿态并洗入当前先攻，输入及探索牌堆不变", () => {
  const state = fixture();
  const before = structuredClone(state);
  const result = applyCommand(state, command);
  expect(refused(result)).toBe(false);
  const summons = result.state.battle!.entities.filter((e) => e.id.startsWith("pounder-summon:"));
  expect(summons.map((e) => [e.monsterCardId, e.stance, e.areaId, e.life, e.dodge])).toEqual([
    ["monster_medium:weald:p023", "defensive", "D", 7, 2],
    ["monster_medium:p027", "ranged", "I", 8, 1],
    ["monster_medium:p027", "support", "C", 8, 1],
  ]);
  expect(result.state.battle!.encounter!.deck.filter((s) => s === "monster")).toHaveLength(3);
  expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor + 3);
  expect(summons.find((e) => e.stance === "ranged")).toMatchObject({
    buffStacks: 1,
    riposte: true,
  });
  expect(result.state.dungeon).toEqual(state.dungeon);
  expect(state).toEqual(before);
  expect(applyCommand(state, command)).toEqual(result);
  const repeated = applyCommand(result.state, command);
  expect(refused(repeated)).toBe(true);
  expect(repeated.state).toEqual(result.state);
});

it("已有 Fusilier 计入缺额，Matchman 在场拒绝且不耗 RNG", () => {
  const fusilier = {
    ...createPounderIEntity("matchman", "f", "support"),
    monsterCardId: "monster_medium:p027",
    life: 8,
    dodge: 1,
  };
  const result = applyCommand(fixture([fusilier]), command);
  expect(refused(result)).toBe(false);
  expect(
    result.state.battle!.entities.filter((e) => e.monsterCardId === "monster_medium:p027"),
  ).toHaveLength(2);
  expect(result.state.battle!.rngCursor).toBe(2);
  const state = fixture([createPounderIEntity("matchman", "m", "defensive")]);
  const blocked = applyCommand(state, command);
  expect(refused(blocked)).toBe(true);
  expect(blocked.state).toEqual(state);
});

it("轨已满召唤无效，不增加实体、先攻或骰序", () => {
  const extra = ["defensive", "ranged", "support"].map((stance, i) => ({
    ...createPounderIEntity("matchman", `other${i}`, stance as "defensive" | "ranged" | "support"),
    monsterCardId: "monster_medium:p027",
    life: 8,
    dodge: 1,
  }));
  const state = fixture(extra);
  const result = applyCommand(state, command);
  expect(refused(result)).toBe(false);
  expect(result.state.battle!.entities).toEqual(state.battle!.entities);
  expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor);
});

it("Stygian 下 Pounder I 增援与标准模式相同可用", () => {
  const base = fixture();
  const state = { ...base, dungeon: { ...base.dungeon!, mode: "stygian" as const } };
  expect(refused(applyCommand(state, command))).toBe(false);
});

it.each(["version", "level", "pack", "actor"])("拒绝 %s 越界且原子保留输入", (kind) => {
  let state = fixture();
  if (kind === "version")
    state = {
      ...state,
      dungeon: { ...state.dungeon!, pounderHamletThreats: undefined } as unknown as NonNullable<
        GameState["dungeon"]
      >,
    };
  if (kind === "level") state = { ...state, dungeon: { ...state.dungeon!, campaignLevel: 2 } };
  if (kind === "pack") state = { ...state, dungeon: { ...state.dungeon!, contentPacks: ["core"] } };
  const result = applyCommand(state, kind === "actor" ? { ...command, actorId: "h" } : command);
  expect(refused(result)).toBe(true);
  expect(result.state).toEqual(state);
});
