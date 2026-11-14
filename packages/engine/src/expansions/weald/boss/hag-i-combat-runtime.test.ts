import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { createBattleState, type BattleEntity } from "../../../battle";
import { applyCommand } from "../../../command";
import {
  applyEncounterCommand,
  finishTurn,
  removeCasualties,
  endAfterCasualties,
} from "../../../encounter";
import type { GameState } from "../../../command";
import type { MonsterCardView } from "../../../monster-skill";
import type { SkillStance } from "../../../hero-skill";
import { createLootState } from "../../../loot";
import {
  HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID,
  HAG_I_CAULDRON_FULL_MONSTER_CARD_ID,
  HAG_I_COMBAT_MONSTER_CARD_ID,
  HAG_I_FIRST_ACTION_INDEX,
  HAG_I_INTO_THE_POT_SKILL_SLOT,
  HAG_I_SCRIPT_ID,
  applyHagICauldronBattleStart,
  applyHagICauldronEmptyToFullMorph,
  clearBossScriptsForTest,
  ensureHagIBossScriptRegistered,
  getBossScript,
  hagIntoThePotShouldForceSkill,
  readHagICauldronBattleStartPlan,
  readHagICauldronFullMorphPlan,
  readHagIIntoThePotEnabled,
  readHagIIntoThePotSkillSlot,
  runBossHook,
  FACE_THE_THREAT_QUEST_ID,
} from "../../../boss/index";

const stances: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

function cards<T>(file: string): T[] {
  return (
    JSON.parse(
      readFileSync(
        new URL(`../../../../../data/normalized/corebox/${file}.json`, import.meta.url),
        "utf8",
      ),
    ) as { cards: T[] }
  ).cards;
}

const heroProfiles = cards<NonNullable<import("../../../battle").BattleSetup["heroStats"]>[number]>(
  "hero_stat",
).filter((card) => card.attributesVerified && card.level === 1);

function verifiedMonsterCard(id: string, life: number, width: 1 | 2 = 1): MonsterCardView {
  return {
    id,
    name: id,
    life,
    dodge: 0,
    speed: 1,
    verification: { unverified: false },
    skills: [],
    typeTags: ["Human"],
    type_position_tags: ["Human", "Front"],
    ...(width === 2 ? { size: "large" as const } : {}),
  } as MonsterCardView;
}

const hagLife = 60;
const cauldronLife = 100;
const cauldronFullLife = 120;
const soldier = cards<MonsterCardView>("monster_medium").find(
  (card) => card.id === "monster_medium:p001",
)!;
const markSkillTemplate = soldier.skills.find((skill) => skill.slot === 1)!;
const intoThePotSkill = {
  ...markSkillTemplate,
  slot: HAG_I_INTO_THE_POT_SKILL_SLOT,
  target: "Furthest",
};
const hagCardBase = verifiedMonsterCard(HAG_I_COMBAT_MONSTER_CARD_ID, hagLife, 2);
const hagCard: MonsterCardView = {
  ...hagCardBase,
  skills: [intoThePotSkill],
};
const cauldronCard = verifiedMonsterCard(HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID, cauldronLife, 2);
const cauldronFullCard = verifiedMonsterCard(
  HAG_I_CAULDRON_FULL_MONSTER_CARD_ID,
  cauldronFullLife,
  2,
);

function hagBossDungeon(): GameState["dungeon"] {
  return {
    phase: "inBattle",
    cursor: 0,
    heroes: [],
    questDistribution: { questId: FACE_THE_THREAT_QUEST_ID, campaignLevel: 1 },
    activeBossThreatScriptId: HAG_I_SCRIPT_ID,
  } as unknown as GameState["dungeon"];
}

function hagBattle(extra?: Partial<GameState["battle"]>): GameState {
  const hag: BattleEntity = {
    id: "hag",
    side: "monster",
    hero: null,
    monsterCardId: hagCard.id,
    life: hagLife,
    dodge: 0,
    areaId: "a",
    stance: "aggressive",
    stanceSlots: 2,
    wounds: 0,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  };
  const names = ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"] as const;
  const heroes: BattleEntity[] = names.map((name, index) => {
    const stat = heroProfiles.find((card) => card.name === name)!;
    return {
      id: `h${index}`,
      side: "hero",
      areaId: stances[index] === "aggressive" ? "a" : "b",
      stance: stances[index]!,
      hero: name,
      heroStatId: stat.id,
      life: stat.life,
      skillIds: [],
      wounds: 0,
      stress: 0,
      dodge: 0,
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    };
  });
  return {
    ...createBattleState(3, {
      entities: [...heroes, hag],
      monsters: [hagCard, cauldronCard, cauldronFullCard],
      areas: [
        { id: "a", elevation: "normal", adjacent: ["b", "m"], capacity: 10 },
        { id: "b", elevation: "normal", adjacent: ["a", "m"], capacity: 10 },
        { id: "m", elevation: "normal", adjacent: ["a", "b"], capacity: 10 },
      ],
      // 受控夹具：怪物部署区域与英雄区域明确不同，不代表 10 号板块已核准。
      monsterStanceAreas: { aggressive: "a", defensive: "a", ranged: "m", support: "m" },
      light: 5,
      skills: [],
      heroStats: heroProfiles,
      lootPool: createLootState(),
      ...extra,
    }),
    dungeon: hagBossDungeon(),
  } as GameState;
}

describe("W4 受控战斗时序（非正式出征验收）", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureHagIBossScriptRegistered();
  });

  it("W4 受控清场：Hag 死亡交接时移出空锅并结束战斗，不追加伤口／RNG／奖励", () => {
    const started = applyEncounterCommand(hagBattle(), { type: "startBattle" }).state;
    const dead: GameState = {
      ...started,
      battle: {
        ...started.battle!,
        entities: started.battle!.entities.map((e) =>
          e.id === "hag" ? { ...e, dead: true, wounds: e.life! } : e,
        ),
      },
    };
    const before = structuredClone(dead);
    const removed = removeCasualties({ state: dead, events: [] }, ["hag"]);
    const empty = removed.state.battle!.entities.find((e) => e.id === "boss:hag:cauldron-empty")!;
    expect(empty).toMatchObject({ dead: true, wounds: 0, life: cauldronLife });
    expect(removed.state.battle!.rngCursor).toBe(dead.battle!.rngCursor);
    expect(removed.state.battle!.loot).toEqual(dead.battle!.loot);
    expect(endAfterCasualties(removed)?.state.battle!.encounter!.turn).toEqual({
      type: "finished",
      outcome: "victory",
    });
    expect(
      removed.events.flatMap((e) => (e.type === "casualtyRemoved" ? [e.actorId] : [])),
    ).toEqual(["hag", empty.id]);
    expect(dead).toEqual(before);
  });

  it("未发生本次 Hag 死亡、非 Boss 遭遇或满锅时不类推清场", () => {
    const started = applyEncounterCommand(hagBattle(), { type: "startBattle" }).state;
    const dead: GameState = {
      ...started,
      battle: {
        ...started.battle!,
        entities: started.battle!.entities.map((e) => (e.id === "hag" ? { ...e, dead: true } : e)),
      },
    };
    const { dungeon: _d, ...ordinary } = dead;
    void _d;
    const full = applyHagICauldronEmptyToFullMorph(started, "hag", 1).state;
    const fullDead: GameState = {
      ...full,
      battle: {
        ...full.battle!,
        entities: full.battle!.entities.map((e) => (e.id === "hag" ? { ...e, dead: true } : e)),
      },
    };
    for (const [state, ids] of [
      [started, ["hag"]],
      [dead, []],
      [ordinary, ["hag"]],
      [fullDead, ["hag"]],
    ] as const) {
      const removed = removeCasualties({ state, events: [] }, ids);
      expect(
        removed.state.battle!.entities.find((e) => e.id === "boss:hag:cauldron-empty")?.dead,
      ).toBe(false);
    }
  });

  it("加载过 Hag 脚本后，非 Boss 遭遇仍每个实体一张先攻", () => {
    const { dungeon: _dungeon, ...state } = hagBattle();
    void _dungeon;
    const started = applyEncounterCommand(state, { type: "startBattle" });
    expect(started.events.some((e) => e.type === "commandRefused")).toBe(false);
    expect(started.state.battle!.encounter!.deck.filter((s) => s === "monster")).toHaveLength(1);
    expect(started.state.battle!.encounter!.deck.filter((s) => s === "hero")).toHaveLength(4);
  });

  it("空锅经过回合开始补给窗口后才跳过，不消费额外随机数", () => {
    const started = applyEncounterCommand(hagBattle({ provisionWindows: true }), {
      type: "startBattle",
    }).state;
    const state: GameState = {
      ...started,
      battle: {
        ...started.battle!,
        encounter: {
          ...started.battle!.encounter!,
          deck: ["monster", "hero"],
          actedIds: ["hag"],
          turn: { type: "awaitingInitiative" },
        },
      },
    };
    const drawn = applyCommand(state, { type: "drawInitiative" });
    expect(drawn.pendingChoice).toBeDefined();
    expect(drawn.state.battle!.encounter!.turn).toEqual({
      type: "monster",
      actorId: "boss:hag:cauldron-empty",
    });
    const continued = applyCommand(drawn.state, {
      type: "resolveChoice",
      choiceId: drawn.pendingChoice!.id,
      optionId: "continue",
    });
    expect(continued.events.some((e) => e.type === "commandRefused")).toBe(false);
    expect(continued.state.battle!.encounter!.turn.type).toBe("awaitingInitiative");
    expect(continued.state.battle!.rngCursor).toBe(state.battle!.rngCursor);
    expect(continued.state.battle!.encounter!.actedIds).toContain("boss:hag:cauldron-empty");
  });

  it("startBattle 四英雄／Hag＋锅洗入 4＋3 张，种子与命令重复一致", () => {
    const base = hagBattle();
    const before = structuredClone(base);
    const a = applyEncounterCommand(base, { type: "startBattle" });
    expect(a).toEqual(applyEncounterCommand(base, { type: "startBattle" }));
    expect(base).toEqual(before);
    expect(a.events.some((e) => e.type === "commandRefused")).toBe(false);
    const battle = a.state.battle!;
    expect(battle.encounter!.deck.filter((s) => s === "monster")).toHaveLength(3);
    expect(battle.encounter!.deck.filter((s) => s === "hero")).toHaveLength(4);
    expect(battle.rngCursor - base.battle!.rngCursor).toBe(6);
  });

  it("Hag 两次、空锅一次自动结束；下一轮重置配额与完整先攻", () => {
    let state = applyEncounterCommand(hagBattle(), { type: "startBattle" }).state;
    const started: string[] = [];
    let hagTurns = 0;
    let skippedPot = 0;
    for (let n = 0; n < 20 && state.battle!.encounter!.round === 1; n++) {
      const drawn = applyEncounterCommand(state, { type: "drawInitiative" });
      expect(drawn.events.some((e) => e.type === "commandRefused")).toBe(false);
      state = drawn.state;
      const start = drawn.events.find((e) => e.type === "turnStarted");
      if (start?.type === "turnStarted") started.push(start.actorId!);
      const turn = state.battle!.encounter!.turn;
      if (start?.type === "turnStarted" && start.actorId === "boss:hag:cauldron-empty") {
        skippedPot++;
        expect(
          drawn.events.some((e) => e.type === "turnEnded" && e.actorId === start.actorId),
        ).toBe(true);
        expect(turn.type).not.toBe("monster");
      } else if (turn.type === "monster") {
        expect(turn.actorId).toBe("hag");
        state = applyEncounterCommand(state, {
          type: "finishMonsterTurn",
          actorId: turn.actorId,
        }).state;
        hagTurns++;
        expect(state.battle!.hagActionsThisRound).toBe(hagTurns);
        expect(state.battle!.encounter!.actedIds.includes("hag")).toBe(hagTurns === 2);
      } else if (turn.type === "hero") {
        // 直接结束受控英雄回合，不当作公开命令自然战役。
        state = finishTurn(state, turn.actorId, []).state;
      }
    }
    expect(hagTurns).toBe(2);
    expect(skippedPot).toBe(1);
    expect(started.filter((id) => id.startsWith("h") && id !== "hag")).toHaveLength(4);
    expect(state.battle!.encounter!.round).toBe(2);
    expect(state.battle!.hagActionsThisRound).toBeUndefined();
    expect(state.battle!.encounter!.actedIds).toEqual([]);
    expect(state.battle!.encounter!.deck).toHaveLength(7);
  });

  it("Full 保留正常怪物回合，不按 Empty 跳过", () => {
    const started = applyEncounterCommand(hagBattle(), { type: "startBattle" }).state;
    const morphed = applyHagICauldronEmptyToFullMorph(started, "hag", 1).state;
    const state: GameState = {
      ...morphed,
      battle: {
        ...morphed.battle!,
        encounter: {
          ...morphed.battle!.encounter!,
          deck: ["monster"],
          actedIds: ["hag"],
          turn: { type: "awaitingInitiative" },
        },
      },
    };
    const drawn = applyEncounterCommand(state, { type: "drawInitiative" });
    expect(drawn.state.battle!.encounter!.turn).toEqual({
      type: "monster",
      actorId: "boss:hag:cauldron-empty",
    });
    expect(drawn.events.some((e) => e.type === "turnEnded")).toBe(false);
  });
});

describe("Hag I · Cauldron Empty 最小运行时", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureHagIBossScriptRegistered();
  });

  it("summon(battleStartCauldron) 声明 Empty Cauldron + stanceArea", () => {
    const script = getBossScript(HAG_I_SCRIPT_ID)!;
    const plan = readHagICauldronBattleStartPlan(script);
    expect(plan).toMatchObject({
      summonMonsterCardId: HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID,
      miniaturePlacement: "stanceArea",
      fixedStance: "ranged",
    });
    const hook = runBossHook(script, "summon", {
      scriptId: HAG_I_SCRIPT_ID,
      skillSlot: 0,
      purpose: "skill",
    });
    expect(hook.status).toBe("stub");
  });

  it("applyHagICauldronBattleStart 写入 Cauldron 实体", () => {
    const applied = applyHagICauldronBattleStart(hagBattle());
    const cauldron = applied.state.battle!.entities.find(
      (entity) => entity.monsterCardId === HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID,
    );
    expect(cauldron).toMatchObject({
      stance: "ranged",
      stanceSlots: 2,
      areaId: "m",
    });
    expect(applied.events.some((event) => event.type === "dungeonUpdated")).toBe(true);
  });

  it("Cauldron 已在场时 applyHagICauldronBattleStart 为 no-op", () => {
    const first = applyHagICauldronBattleStart(hagBattle());
    const second = applyHagICauldronBattleStart(first.state);
    expect(second.events).toHaveLength(0);
  });

  it("W4 / R-048：缺怪物部署标记或落点不存在时拒绝，不从英雄区域猜测", () => {
    const initial = hagBattle();
    const { monsterStanceAreas: _areas, ...withoutMapping } = initial.battle!;
    void _areas;
    for (const battle of [
      withoutMapping,
      {
        ...initial.battle!,
        monsterStanceAreas: { aggressive: "a", defensive: "a", ranged: "missing", support: "m" },
      },
    ]) {
      const state = { ...initial, battle };
      const result = applyHagICauldronBattleStart(state);
      expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
      expect(result.state).toBe(state);
    }
  });

  it("缺 Cauldron 卡面时 startBattle 拒绝", () => {
    const state = hagBattle({
      monsters: [hagCard],
    });
    const started = applyEncounterCommand(state, { type: "startBattle" });
    expect(started.events.some((event) => event.type === "commandRefused")).toBe(true);
  });

  it("startBattle 写入 Cauldron（Boss 战 + 已核实卡）", () => {
    const started = applyEncounterCommand(hagBattle(), { type: "startBattle" });
    expect(started.events.some((event) => event.type === "commandRefused")).toBe(false);
    const cauldron = started.state.battle!.entities.find(
      (entity) => entity.monsterCardId === HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID,
    );
    expect(cauldron).toBeDefined();
  });
});

describe("Hag I · Into the Pot! / Cauldron Full 最小运行时", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureHagIBossScriptRegistered();
  });

  it("intoThePot 钩子与 cauldronFullMorph 计划", () => {
    const script = getBossScript(HAG_I_SCRIPT_ID)!;
    expect(readHagIIntoThePotEnabled(script)).toBe(true);
    expect(readHagIIntoThePotSkillSlot(script)).toBe(HAG_I_INTO_THE_POT_SKILL_SLOT);
    expect(readHagICauldronFullMorphPlan(script)).toMatchObject({
      summonMonsterCardId: HAG_I_CAULDRON_FULL_MONSTER_CARD_ID,
    });
  });

  function hagBattleWithCauldron(extra?: Partial<GameState["battle"]>): GameState {
    let state = hagBattle(extra);
    state = applyHagICauldronBattleStart(state).state;
    return state;
  }

  function monsterTurn(state: GameState, hagId = "hag"): GameState {
    const battle = state.battle!;
    return {
      ...state,
      battle: {
        ...battle,
        encounter: {
          round: 1,
          deck: ["monster"],
          actedIds: [],
          turn: { type: "monster", actorId: hagId },
        },
        hagActionsThisRound: HAG_I_FIRST_ACTION_INDEX,
      },
    } as GameState;
  }

  it("Empty Cauldron 在场且首轮首次行动 → 强制 Into the Pot!", () => {
    const state = monsterTurn(hagBattleWithCauldron());
    expect(hagIntoThePotShouldForceSkill(state, "hag")).toBe(true);
  });

  it("R-255：Full 不强制；下一次 Hag 回合锅仍空则仍强制", () => {
    let state = monsterTurn(hagBattleWithCauldron());
    const morphed = applyHagICauldronEmptyToFullMorph(state, "hag", HAG_I_INTO_THE_POT_SKILL_SLOT);
    state = monsterTurn(morphed.state);
    expect(hagIntoThePotShouldForceSkill(state, "hag")).toBe(false);

    state = monsterTurn(hagBattleWithCauldron());
    state = {
      ...state,
      battle: { ...state.battle!, hagActionsThisRound: 1 },
    };
    expect(hagIntoThePotShouldForceSkill(state, "hag")).toBe(true);
  });

  it("applyHagICauldronEmptyToFullMorph 切换卡面", () => {
    const state = hagBattleWithCauldron();
    const result = applyHagICauldronEmptyToFullMorph(state, "hag", HAG_I_INTO_THE_POT_SKILL_SLOT);
    const cauldron = result.state.battle!.entities.find(
      (entity) => entity.id === "boss:hag:cauldron-empty",
    );
    expect(cauldron).toMatchObject({
      monsterCardId: HAG_I_CAULDRON_FULL_MONSTER_CARD_ID,
      life: cauldronFullLife,
      wounds: 0,
    });
    expect(result.state.battle!.entities.map((entity) => entity.id)).toEqual(
      state.battle!.entities.map((entity) => entity.id),
    );
    expect(state.battle!.entities.find((entity) => entity.id === cauldron!.id)?.monsterCardId).toBe(
      HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID,
    );
  });

  it("prepareMonsterAction 在 Empty 锅时选 Into the Pot! slot", () => {
    const state = monsterTurn(hagBattleWithCauldron());
    const prepared = applyCommand(state, { type: "prepareMonsterAction", actorId: "hag" });
    const refused = prepared.events.find((event) => event.type === "commandRefused");
    expect(refused, refused?.message).toBeUndefined();
    const event = prepared.events.find((entry) => entry.type === "monsterActionPrepared");
    expect(event).toMatchObject({ skillSlot: HAG_I_INTO_THE_POT_SKILL_SLOT });
  });

  it("Into the Pot! 结算后链式 Empty→Full", () => {
    let state = monsterTurn(hagBattleWithCauldron());
    const prepared = applyCommand(state, { type: "prepareMonsterAction", actorId: "hag" });
    expect(prepared.state.battle!.monsterAction?.skillSlot).toBe(HAG_I_INTO_THE_POT_SKILL_SLOT);
    state = prepared.state;
    const action = state.battle!.monsterAction!;
    const resolved = applyCommand(state, {
      type: "playMonsterSkill",
      actorId: "hag",
      skillSlot: action.skillSlot,
      targetId: action.targetId,
    });
    const playRefused = resolved.events.find((event) => event.type === "commandRefused");
    expect(playRefused, playRefused?.message).toBeUndefined();
    const cauldron = resolved.state.battle!.entities.find(
      (entity) => entity.id === "boss:hag:cauldron-empty",
    );
    expect(cauldron?.monsterCardId).toBe(HAG_I_CAULDRON_FULL_MONSTER_CARD_ID);
  });
});
